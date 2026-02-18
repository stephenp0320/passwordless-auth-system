from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone

# https://flask-sqlalchemy.readthedocs.io/en/stable/quickstart/
db = SQLAlchemy()

# database model for users
class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key = True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    
    # the relationships 
    # https://medium.com/@philipdutra/understanding-relationships-in-flask-sqlalchemy-one-to-many-vs-many-to-many-6050d04c6cf0
    credentials = db.relationship('Credential', backref='user', lazy=True, cascade='all, delete-orphan')
    recovery_codes = db.relationship('RecoveryCode', backref='user', lazy=True, cascade='all, delete-orphan')

    
