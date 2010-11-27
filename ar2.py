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

_encoder = ModelEncoder()
def sendjson(handler, value):
    """Encode the value as JSON and send to the client."""
    handler.response.out.write(_encoder.encode(value))

class JSONHandler(webapp.RequestHandler):
    """A handler that reports errors in JSON instead of in HTML."""
    def handle_exception(self, exc, debug_mode):
        if isinstance(exc, NotFoundError):
            self.error(404)
            sendjson(self, {'error': True, 'message': 'not found'})
            logging.error('not found')
        elif isinstance(exc, AuthenticationError):
            self.error(403)
            sendjson(self, {'error': True, 'message': 'not logged in'})
            logging.info('not logged in')
        else:
            exc_string = traceback.format_exc(exc)
            self.error(500)
            report = {'error': True, 'message': 'server error'}
            if debug_mode:
                report['exception'] = exc_string
            sendjson(self, report)
            logging.error(exc_string)


# Authentication.

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


# Application setup.

application = webapp.WSGIApplication([
], debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
