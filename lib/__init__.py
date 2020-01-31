import config
from flask import Flask
from flask_migrate import Migrate
from flask_webpack import Webpack
from flask_security import SQLAlchemyUserDatastore, Security
from raven.contrib.flask import Sentry
from .models import User, Role
from .datastore import db
from .routes import bp
from .events import socketio

def create_app(package_name=__name__, static_folder='../front/static', template_folder='../front/templates', **config_overrides):
    app = Flask(package_name,
                static_url_path='/assets',
                static_folder=static_folder,
                template_folder=template_folder)
    app.config.from_object(config)

    # Apply overrides
    app.config.update(config_overrides)

    # Initialize the database and declarative Base class
    db.init_app(app)
    Migrate(app, db)
    app.db = db

    # Setup security
    app.user_db = SQLAlchemyUserDatastore(db, User, Role)
    Security(app, app.user_db)

    # SocketIO
    socketio.init_app(app)
    app.socketio = socketio

    # Other extensions
    Webpack(app)

    # Create the database tables.
    # Flask-SQLAlchemy needs to know which
    # app context to create the tables in.
    with app.app_context():
        db.configure_mappers()
        db.create_all()

    # Register blueprints
    app.register_blueprint(bp)

    if not app.debug:
        Sentry(app, dsn=config.SENTRY_DSN)

    return app
