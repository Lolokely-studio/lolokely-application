from app import db, bcrypt
from models.user import User
from datetime import datetime
import uuid

class AuthService:
    def create_user(self, user_data):
        """Create a new user with hashed password"""
        password_hash = bcrypt.generate_password_hash(user_data['password']).decode('utf-8')
        
        user = User(
            email=user_data['email'],
            password_hash=password_hash,
            first_name=user_data['first_name'],
            last_name=user_data['last_name']
        )
        
        db.session.add(user)
        db.session.commit()
        
        return user
    
    def authenticate_user(self, email, password):
        """Authenticate user with email and password"""
        user = User.query.filter_by(email=email).first()
        
        if user and bcrypt.check_password_hash(user.password_hash, password):
            return user
        
        return None
    
    def get_user_by_id(self, user_id):
        """Get user by ID"""
        return User.query.get(user_id)
