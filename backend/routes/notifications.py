from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import get_connection
from psycopg2.extras import RealDictCursor
import traceback

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('/', methods=['GET'])
@jwt_required()
def get_notifications():
    """Get all notifications for the current user"""
    try:
        user_id = get_jwt_identity()
        
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT n.id, n.type, n.message, n.related_task_id, n.related_subtask_id,
                           n.created_by_user_id, n.is_read, n.created_at,
                           u.first_name, u.last_name, u.email
                    FROM notifications n
                    LEFT JOIN users u ON n.created_by_user_id = u.id
                    WHERE n.user_id = %s
                    ORDER BY n.created_at DESC
                    LIMIT 50
                    """,
                    (user_id,)
                )
                notifications = cur.fetchall()
        
        return jsonify({
            'notifications': [{
                'id': n['id'],
                'type': n['type'],
                'message': n['message'],
                'related_task_id': n['related_task_id'],
                'related_subtask_id': n['related_subtask_id'],
                'created_by_user_id': n['created_by_user_id'],
                'created_by_user': {
                    'first_name': n['first_name'],
                    'last_name': n['last_name'],
                    'email': n['email']
                } if n['first_name'] else None,
                'is_read': n['is_read'],
                'created_at': n['created_at'].isoformat() if n['created_at'] else None
            } for n in notifications]
        }), 200
        
    except Exception as e:
        print(f"Error in get_notifications: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@notifications_bp.route('/unread-count', methods=['GET'])
@jwt_required()
def get_unread_count():
    """Get count of unread notifications for the current user"""
    try:
        user_id = get_jwt_identity()
        
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT COUNT(*) FROM notifications WHERE user_id = %s AND is_read = false",
                    (user_id,)
                )
                count = cur.fetchone()[0]
        
        return jsonify({'count': count}), 200
        
    except Exception as e:
        print(f"Error in get_unread_count: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@notifications_bp.route('/<notification_id>/read', methods=['PUT'])
@jwt_required()
def mark_as_read(notification_id):
    """Mark a notification as read"""
    try:
        user_id = get_jwt_identity()
        
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE notifications SET is_read = true WHERE id = %s AND user_id = %s",
                    (notification_id, user_id)
                )
                conn.commit()
                if cur.rowcount == 0:
                    return jsonify({'error': 'Notification not found'}), 404
        
        return jsonify({'message': 'Notification marked as read'}), 200
        
    except Exception as e:
        print(f"Error in mark_as_read: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@notifications_bp.route('/mark-all-read', methods=['PUT'])
@jwt_required()
def mark_all_as_read():
    """Mark all notifications as read for the current user"""
    try:
        user_id = get_jwt_identity()
        
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    "UPDATE notifications SET is_read = true WHERE user_id = %s AND is_read = false",
                    (user_id,)
                )
                conn.commit()
        
        return jsonify({'message': 'All notifications marked as read'}), 200
        
    except Exception as e:
        print(f"Error in mark_all_as_read: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

