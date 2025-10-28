from app import db
from models.user import User

class UserService:
    def get_all_users(self):
        """Get all users"""
        return User.query.all()
    
    def get_user_by_id(self, user_id):
        """Get user by ID"""
        return User.query.get(user_id)
