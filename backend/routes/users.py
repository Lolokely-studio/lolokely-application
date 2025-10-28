from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models.user import User
from services.user_service import UserService

users_bp = Blueprint('users', __name__)
user_service = UserService()

@users_bp.route('/', methods=['GET'])
@jwt_required()
def get_users():
    try:
        users = user_service.get_all_users()
        
        return jsonify({
            'users': [user.to_dict() for user in users]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/<user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    try:
        user = user_service.get_user_by_id(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'user': user.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
