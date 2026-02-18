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

    
class Credential(db.Model):
    __tablename__ = 'credentials'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # the WebAuthn credential data  
    credential_id = db.Column(db.LargeBinary, nullable=False)
    public_key = db.Column(db.LargeBinary, nullable=False)
    sign_count = db.Column(db.Integer, default=0)
    
    # The authenticator information
    # platform or cross-platform
    authenticator_type = db.Column(db.String(20)) 
    aaguid = db.Column(db.String(36))
    
    # Backup state
    backup_eligible = db.Column(db.Boolean, default=False)
    backup_state = db.Column(db.Boolean, default=False)
    
    # The attestation information
    attestation_fmt = db.Column(db.String(20))
    trust_level = db.Column(db.String(20))
    mds_verified = db.Column(db.Boolean, default=False)
    
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
