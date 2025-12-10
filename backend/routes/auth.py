from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app import bcrypt
from schemas.user_schema import UserSchema, LoginSchema
from marshmallow import ValidationError
from db import get_connection
import uuid
from datetime import datetime
from psycopg2.extras import RealDictCursor
import traceback

auth_bp = Blueprint('auth', __name__)
user_schema = UserSchema()
login_schema = LoginSchema()

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        # Validate input data
        try:
            validated_data = user_schema.load(data)
        except ValidationError as err:
            print(f"Validation error: {err.messages}")  # Debug print
            return jsonify({'error': 'Validation error', 'details': err.messages}), 400
        
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Check if user already exists
                cur.execute("SELECT id FROM users WHERE email = %s", (validated_data['email'],))
                if cur.fetchone():
                    return jsonify({'error': 'User already exists'}), 409

                user_id = str(uuid.uuid4())
                password_hash = bcrypt.generate_password_hash(validated_data['password']).decode('utf-8')
                now = datetime.utcnow()
                cur.execute(
                    """
                    INSERT INTO users (id, email, password_hash, first_name, last_name, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, email, first_name, last_name, is_admin, created_at, updated_at
                    """,
                    (user_id, validated_data['email'], password_hash, validated_data['first_name'], validated_data['last_name'], now, now)
                )
                user_row = cur.fetchone()
                conn.commit()

        access_token = create_access_token(identity=user_row['id'])
        return jsonify({'message': 'User created successfully', 'user': {
            'id': user_row['id'],
            'email': user_row['email'],
            'first_name': user_row['first_name'],
            'last_name': user_row['last_name'],
            'is_admin': user_row.get('is_admin', False),
            'created_at': user_row['created_at'].isoformat() if user_row['created_at'] else None,
            'updated_at': user_row['updated_at'].isoformat() if user_row['updated_at'] else None,
        }, 'access_token': access_token}), 201
        
    except Exception as e:
        print(f"Error in register: {str(e)}")
        traceback.print_exc()
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
        
        with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id, email, password_hash, first_name, last_name, is_admin, created_at, updated_at FROM users WHERE email = %s", (validated_data['email'],))
            user = cur.fetchone()
        if not user or not bcrypt.check_password_hash(user['password_hash'], validated_data['password']):
            return jsonify({'error': 'Invalid credentials'}), 401
        access_token = create_access_token(identity=user['id'])
        return jsonify({'message': 'Login successful', 'user': {
            'id': user['id'],
            'email': user['email'],
            'first_name': user['first_name'],
            'last_name': user['last_name'],
            'is_admin': user.get('is_admin', False),
            'created_at': user['created_at'].isoformat() if user['created_at'] else None,
            'updated_at': user['updated_at'].isoformat() if user['updated_at'] else None,
        }, 'access_token': access_token}), 200
        
    except Exception as e:
        print(f"Error in login: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        user_id = get_jwt_identity()
        with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id, email, first_name, last_name, is_admin, created_at, updated_at FROM users WHERE id = %s", (user_id,))
            user = cur.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify({'user': {
            'id': user['id'],
            'email': user['email'],
            'first_name': user['first_name'],
            'last_name': user['last_name'],
            'is_admin': user.get('is_admin', False),
            'created_at': user['created_at'].isoformat() if user['created_at'] else None,
            'updated_at': user['updated_at'].isoformat() if user['updated_at'] else None,
        }}), 200
        
    except Exception as e:
        print(f"Error in get_current_user: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
