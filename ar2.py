import sys
import traceback
import logging
import uuid
import urllib
import datetime
import time

sys.path.insert(0, 'lib')
try:
    import json
except ImportError:
    import simplejson as json
import iso8601

from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.api import users
from google.appengine.api import memcache
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from google.appengine.api import datastore_errors


# Utility functions.

def string_to_dt(s):
    """Convert an ISO8601-formatted date string to a datetime object."""
    return datetime.datetime.fromtimestamp(iso8601.parse(s))
def dt_to_string(dt):
    """Convert a datetime object to an ISO8601 string."""
    return iso8601.tostring(time.mktime(dt.timetuple()))

def render(handler, name, values):
    """Render the given template and send to the client."""
    handler.response.out.write(
        template.render(os.path.join(TEMPLATE_DIR, name), values)
    )

def generate_apikey():
    """Generate a unique string of letters and numbers."""
    return uuid.uuid4().hex


# Exceptions.

class NotFoundError(Exception):
    pass
class AuthenticationError(Exception):
    pass
class ParameterError(Exception):
    pass


# JSON helpers for API functions.

class ModelEncoder(json.JSONEncoder):
    def default(self, obj):

        # Encode Model objects.
        if isinstance(obj, db.Model):
            out = {}

            # Get all of the object's instances.
            for name, _ in obj.properties().items():
                out[name] = getattr(obj, name)

            # Try to add the key, but don't sweat it if it doesn't have one.
            try:
                out['id'] = obj.key()
            except db.NotSavedError:
                pass

            return out

        # Encode various types used by models (incomplete).
        elif isinstance(obj, datetime.datetime):
            return dt_to_string(obj)
        elif isinstance(obj, db.Key):
            return str(obj)
        elif isinstance(obj, db.Link):
            return str(obj)
        elif isinstance(obj, db.Email):
            return str(obj)
        elif isinstance(obj, users.User):
            return obj.user_id()
    
        return json.JSONEncoder.default(self, obj)
_json_encoder = ModelEncoder()

class JSONHandler(webapp.RequestHandler):
    """A handler that reads and writes JSON."""
    def handle_exception(self, exc, debug_mode):
        if isinstance(exc, NotFoundError):
            self.error(404)
            self.send({'error': True, 'message': 'not found'})
            logging.error('not found')
        elif isinstance(exc, AuthenticationError):
            self.error(403)
            self.send({'error': True, 'message': 'not logged in'})
            logging.info('not logged in')
        else:
            exc_string = traceback.format_exc(exc)
            self.error(500)
            report = {'error': True, 'message': 'server error'}
            if debug_mode:
                report['exception'] = exc_string
            self.send(report)
            logging.error(exc_string)

    def reqdata(self):
        reqstr = urllib.unquote(self.request.body)
        logging.info('request JSON: ' + reqstr)
        return json.loads(reqstr)
    
    def send(self, obj):
        self.response.out.write(_json_encoder.encode(obj))


# Model classes.

class Paper(db.Model):
    user = db.UserProperty()
    description = db.StringProperty()
    link = db.LinkProperty()
    tags = db.StringListProperty(default=[])
    
    read = db.BooleanProperty(default=False)
    readdate = db.DateTimeProperty()
    added = db.DateTimeProperty(auto_now_add=True)

class Settings(db.Model):
    user = db.UserProperty()
    apikey = db.StringProperty()


# User model and settings.

def get_settings(user):
    """Get the settings object for the given user."""
    q = Settings.all().filter('user =', user)
    settings = q.get()
    if not settings:
        # No settings yet! Create them.
        settings = Settings()
        settings.user = user
        settings.apikey = generate_apikey()
        settings.put()
    
    return settings

def user_for_apikey(key):
    """Returns a User object associated with the given API key. If none
    match, returns None.
    """
    settings = Settings.all().filter('apikey =', key).get()
    if settings:
        return settings.user
    return None

def current_user(handler):
    """Gets the current user for the request. If an API key is specified,
    the associated user is returned. Otherwise, the currently logged-in
    user is returned. If neither are present, returns None.
    """
    apikey = handler.request.get('apikey')
    if apikey:
        user = user_for_apikey(apikey)
        if user:
            return user
    return users.get_current_user()

def require_user(handler):
    """Like current_user, but raises an AuthenticationError if no user
    is available.
    """
    user = current_user(handler)
    if not user:
        raise AuthenticationError()
    return user
    

# Model utilities.

def get_paper(handler, key):
    """Get and return a paper object matching the given key. The paper
    must belong to the current user. Raises a NotFoundException if
    there is no match.
    """
    user = current_user(handler)
    if not user:
        raise NotFoundException()
        
    try:
        paper = db.get(db.Key(key))
    except datastore_errors.BadKeyError:
        raise NotFoundException()
    if not isinstance(paper, Paper):
        raise NotFoundException()
    if paper.user != user:
        raise NotFoundException()

    return paper

def update_paper(paper, data):
    for key, value in data.iteritems():
        if key in ('description', 'link', 'tags', 'read'):
            if key == 'link' and not value:
                paper.link = None
                continue
            elif key == 'read' and value and not paper.read:
                # Transitioning to read state. Set read date.
                paper.readdate = datetime.datetime.now()
            setattr(paper, key, value)

def papers_cachekey(user):
    """Returns the memcache key for a user's paper list.
    """
    return 'papers:' + user.user_id()


# Handlers.

class PaperList(JSONHandler):
    def get(self):
        user = require_user(self)
        
        # Do we have the list cached?
        res = memcache.get(papers_cachekey(user))
        if res:
            self.response.out.write(res)
            return
        
        logging.info('paper list cache miss for ' + str(user))
        
        papers = Paper.all().filter('user =', user)
        paper_list = [paper for paper in papers]
        
        papers_json = _json_encoder.encode(paper_list)
        
        # Cache the list.
        memcache.set(papers_cachekey(user), papers_json)
        
        self.response.out.write(papers_json)

    # Add a new paper.
    def post(self):
        user = require_user(self)
        
        paper = Paper()
        paper.user = user
        update_paper(paper, self.reqdata())
        paper.put()
        
        # Invalidate the user's paper cache.
        memcache.delete(papers_cachekey(user))
        
        self.send(paper)

class SinglePaper(JSONHandler):
    def get(self, paper_key):
        self.send(get_paper(self, paper_key))

    # Update a paper.
    def put(self, paper_key):
        paper = get_paper(self, paper_key)
        update_paper(paper, self.reqdata())
        paper.put()
        
        memcache.delete(papers_cachekey(user))
        
        self.send(paper)
    
    def delete(self, paper_key):
        paper = get_paper(self, paper_key)
        paper.delete()
        memcache.delete(papers_cachekey(user))
        self.send({'success': True})

class SettingsHandler(JSONHandler):
    def get(self):
        user = require_user(self)
        settings = get_settings(user)
        
        self.send({'apikey': settings.apikey})

    def post(self):
        user = require_user(self)
        settings = get_settings(user)
        
        if 'apikeyregen' in self.reqdata():
            settings.apikey = generate_apikey()
            settings.put()
        
        self.send({'apikey': settings.apikey})

class LoginHandler(webapp.RequestHandler):
    def get(self, identity):
        url = users.create_login_url(dest_url='/',
                                     federated_identity=identity)
        self.redirect(url)

class LogoutHandler(webapp.RequestHandler):
    def get(self):
        url = users.create_logout_url('/')
        self.redirect(url)


# Application setup.

application = webapp.WSGIApplication([
    (r'/papers/?', PaperList),
    (r'/papers/(.+)', SinglePaper),
    
    (r'/settings', SettingsHandler),
    (r'/login/(.+)', LoginHandler),
    (r'/logout', LogoutHandler),
], debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
