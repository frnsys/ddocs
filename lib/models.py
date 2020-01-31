from .datastore import db
from datetime import datetime
from flask_security import UserMixin, RoleMixin

roles_users = db.Table('roles_users',
        db.Column('user_id', db.Integer(), db.ForeignKey('user.id')),
        db.Column('role_id', db.Integer(), db.ForeignKey('role.id')))


class Role(db.Model, RoleMixin):
    id          = db.Column(db.Integer(), primary_key=True)
    name        = db.Column(db.String(80), unique=True)
    description = db.Column(db.String(255))


class User(db.Model, UserMixin):
    id              = db.Column(db.Integer(), primary_key=True)
    email           = db.Column(db.String(255), unique=True)
    active          = db.Column(db.Boolean())
    confirmed_at    = db.Column(db.DateTime())
    created_at      = db.Column(db.DateTime(), default=datetime.utcnow)
    updated_at      = db.Column(db.DateTime(), default=datetime.utcnow, onupdate=datetime.utcnow)
    password        = db.Column(db.String(255))
    roles           = db.relationship('Role', secondary=roles_users,
                                      backref=db.backref('users', lazy='dynamic'))


class Document(db.Model):
    id              = db.Column(db.String(), primary_key=True)
    data            = db.Column(db.Unicode())
