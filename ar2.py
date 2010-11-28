import sys
import traceback
import logging

sys.path.insert(0, 'lib')
try:
    import json
except ImportError:
    import simplejson as json

from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.api import users
from google.appengine.api import memcache
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from google.appengine.api import datastore_errors


# Utility functions.

def render(handler, name, values):
    """Render the given template and send to the client."""
    handler.response.out.write(
        template.render(os.path.join(TEMPLATE_DIR, name), values)
    )


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
                out['key'] = obj.key()
            except db.NotSavedError:
                pass

            return out

        # Encode various types used by models (incomplete).
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
        logging.error(self.request.body)
        return json.loads(self.request.body)
    
    def send(self, obj):
        self.response.out.write(_json_encoder.encode(obj))


# Authentication.

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
    # apikey = handler.request.get('apikey')
    # if apikey:
    #     user = user_for_apikey(apikey)
    #     if user:
    #         return user
    return users.get_current_user()

def require_user(handler):
    """Like current_user, but raises an AuthenticationError if no user
    is available.
    """
    user = current_user(handler)
    if not user:
        raise AuthenticationError()
    return user


# Model classes.

class Paper(db.Model):
    user = db.UserProperty()
    description = db.StringProperty()
    link = db.LinkProperty()
    tags = db.StringListProperty(default=[])


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


# Handlers.

class PaperList(JSONHandler):
    def get(self, tag_filter=None):
        user = require_user(self)
        
        papers = Paper.all().filter('user =', user)
        if tag_filter:
            not_due.filter('tags =', tag_filter)
        
        paper_dict = {}
        for paper in papers:
            paper_dict[str(paper.key())] = paper
            
        self.send(paper_dict)

    # Add a new paper.
    def post(self, tag_filter=None):
        #fixme tag_filter is ignored here.
        user = require_user(self)
        
        paper = Paper()
        paper.user = user

        for key, value in self.reqdata().iteritems():
            if key in ('description', 'link', 'tags'):
                setattr(paper, key, value)
        
        paper.put()
        
        self.send(paper)

class SinglePaper(JSONHandler):
    def get(self, paper_key):
        self.send(get_paper(self, paper_key))

    # Update a paper.
    def put(self, paper_key):
        paper = get_paper(self, paper_key)
        
        for key, value in self.reqdata():
            if key in ('description', 'link', 'tags'):
                setattr(paper, key, value)
                
        paper.put()
        
        self.send(paper)
    
    def delete(self, paper_key):
        paper = get_paper(self, paper_key)
        paper.delete()
        self.send({'success': True})

class LoginHandler(webapp.RequestHandler):
    def get(self, identity):
        login_url = users.create_login_url(dest_url='/',
                                           federated_identity=identity)
        self.redirect(login_url)


# Application setup.

application = webapp.WSGIApplication([
    (r'/papers/?', PaperList),
    (r'/papers/(.+)', SinglePaper),
    
    (r'/login/(.+)', LoginHandler),
], debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
