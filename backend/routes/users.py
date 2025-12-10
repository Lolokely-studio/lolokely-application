from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required
from db import get_connection
from psycopg2.extras import RealDictCursor

users_bp = Blueprint('users', __name__)

@users_bp.route('/', methods=['GET'])
@jwt_required()
def get_users():
    try:
        with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id, email, first_name, last_name, is_admin, created_at, updated_at FROM users ORDER BY created_at DESC")
            users = cur.fetchall()
        return jsonify({'users': [{
            'id': u['id'],
            'email': u['email'],
            'first_name': u['first_name'],
            'last_name': u['last_name'],
            'is_admin': u.get('is_admin', False),
            'created_at': u['created_at'].isoformat() if u['created_at'] else None,
            'updated_at': u['updated_at'].isoformat() if u['updated_at'] else None,
        } for u in users]}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@users_bp.route('/<user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    try:
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
        return jsonify({'error': str(e)}), 500
