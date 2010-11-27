from google.appengine.ext import webapp
from google.appengine.ext.webapp.util import run_wsgi_app
from google.appengine.api import users
from google.appengine.api import memcache
from google.appengine.ext import db
from google.appengine.ext.webapp import template
from google.appengine.api import datastore_errors

application = webapp.WSGIApplication([
], debug=True)

def main():
    run_wsgi_app(application)

if __name__ == "__main__":
    main()
