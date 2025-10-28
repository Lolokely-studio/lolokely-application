from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import db, bcrypt
from models.user import User
from services.auth_service import AuthService
from schemas.user_schema import UserSchema, LoginSchema
from marshmallow import ValidationError

auth_bp = Blueprint('auth', __name__)
auth_service = AuthService()
user_schema = UserSchema()
login_schema = LoginSchema()

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Validate input data
        try:
            validated_data = user_schema.load(data)
        except ValidationError as err:
            return jsonify({'error': 'Validation error', 'details': err.messages}), 400
        
        # Check if user already exists
        if User.query.filter_by(email=validated_data['email']).first():
            return jsonify({'error': 'User already exists'}), 409
        
        # Create new user
        user = auth_service.create_user(validated_data)
        
        # Generate JWT token
        access_token = create_access_token(identity=str(user.id))
        
        return jsonify({
            'message': 'User created successfully',
            'user': user.to_dict(),
            'access_token': access_token
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        # Validate input data
        try:
            validated_data = login_schema.load(data)
        except ValidationError as err:
            return jsonify({'error': 'Validation error', 'details': err.messages}), 400
        
        # Authenticate user
        user = auth_service.authenticate_user(validated_data['email'], validated_data['password'])
        
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Generate JWT token
        access_token = create_access_token(identity=str(user.id))
        
        return jsonify({
            'message': 'Login successful',
            'user': user.to_dict(),
            'access_token': access_token
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'user': user.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
