from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from db import get_connection
from schemas.leave_schema import LeaveRequestSchema, LeaveApprovalSchema
from marshmallow import ValidationError
from psycopg2.extras import RealDictCursor
import uuid
from datetime import datetime
import traceback

leaves_bp = Blueprint('leaves', __name__)
leave_request_schema = LeaveRequestSchema()
leave_approval_schema = LeaveApprovalSchema()

def is_admin(user_id):
    """Check if user is an administrator"""
    with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT is_admin FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        return user and user.get('is_admin', False)

@leaves_bp.route('/', methods=['POST'])
@jwt_required()
def create_leave_request():
    """Create a new leave request"""
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        try:
            validated_data = leave_request_schema.load(data)
        except ValidationError as err:
            return jsonify({'error': 'Validation error', 'details': err.messages}), 400
        
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                leave_id = str(uuid.uuid4())
                now = datetime.utcnow()
                cur.execute(
                    """
                    INSERT INTO leave_requests (id, user_id, start_date, end_date, leave_type, reason, status, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, 'pending', %s, %s)
                    RETURNING id, user_id, start_date, end_date, leave_type, reason, status, approved_by, approved_at, rejection_reason, created_at, updated_at
                    """,
                    (
                        leave_id,
                        user_id,
                        validated_data['start_date'],
                        validated_data['end_date'],
                        validated_data['leave_type'],
                        validated_data.get('reason'),
                        now,
                        now
                    )
                )
                leave = cur.fetchone()
                conn.commit()
        
        return jsonify({
            'message': 'Leave request created successfully',
            'leave_request': {
                'id': leave['id'],
                'user_id': leave['user_id'],
                'start_date': leave['start_date'].isoformat() if leave['start_date'] else None,
                'end_date': leave['end_date'].isoformat() if leave['end_date'] else None,
                'leave_type': leave['leave_type'],
                'reason': leave['reason'],
                'status': leave['status'],
                'approved_by': leave['approved_by'],
                'approved_at': leave['approved_at'].isoformat() if leave['approved_at'] else None,
                'rejection_reason': leave['rejection_reason'],
                'created_at': leave['created_at'].isoformat() if leave['created_at'] else None,
                'updated_at': leave['updated_at'].isoformat() if leave['updated_at'] else None,
            }
        }), 201
        
    except Exception as e:
        print(f"Error in create_leave_request: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@leaves_bp.route('/', methods=['GET'])
@jwt_required()
def get_leave_requests():
    """Get all leave requests - approved only for regular users, all for admin"""
    try:
        user_id = get_jwt_identity()
        admin = is_admin(user_id)
        
        with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            if admin:
                # Admin sees all leave requests
                cur.execute(
                    """
                    SELECT lr.*, u.first_name, u.last_name, u.email
                    FROM leave_requests lr
                    JOIN users u ON lr.user_id = u.id
                    ORDER BY lr.created_at DESC
                    """
                )
            else:
                # Regular users see only approved leave requests for the team
                cur.execute(
                    """
                    SELECT lr.*, u.first_name, u.last_name, u.email
                    FROM leave_requests lr
                    JOIN users u ON lr.user_id = u.id
                    WHERE lr.status = 'approved'
                    ORDER BY lr.start_date ASC
                    """
                )
            leaves = cur.fetchall()
        
        return jsonify({
            'leave_requests': [{
                'id': lr['id'],
                'user_id': lr['user_id'],
                'user_name': f"{lr['first_name']} {lr['last_name']}",
                'user_email': lr['email'],
                'start_date': lr['start_date'].isoformat() if lr['start_date'] else None,
                'end_date': lr['end_date'].isoformat() if lr['end_date'] else None,
                'leave_type': lr['leave_type'],
                'reason': lr['reason'],
                'status': lr['status'],
                'approved_by': lr['approved_by'],
                'approved_at': lr['approved_at'].isoformat() if lr['approved_at'] else None,
                'rejection_reason': lr['rejection_reason'],
                'created_at': lr['created_at'].isoformat() if lr['created_at'] else None,
                'updated_at': lr['updated_at'].isoformat() if lr['updated_at'] else None,
            } for lr in leaves]
        }), 200
        
    except Exception as e:
        print(f"Error in get_leave_requests: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@leaves_bp.route('/my-requests', methods=['GET'])
@jwt_required()
def get_my_leave_requests():
    """Get current user's leave requests"""
    try:
        user_id = get_jwt_identity()
        
        with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT * FROM leave_requests
                WHERE user_id = %s
                ORDER BY created_at DESC
                """,
                (user_id,)
            )
            leaves = cur.fetchall()
        
        return jsonify({
            'leave_requests': [{
                'id': lr['id'],
                'user_id': lr['user_id'],
                'start_date': lr['start_date'].isoformat() if lr['start_date'] else None,
                'end_date': lr['end_date'].isoformat() if lr['end_date'] else None,
                'leave_type': lr['leave_type'],
                'reason': lr['reason'],
                'status': lr['status'],
                'approved_by': lr['approved_by'],
                'approved_at': lr['approved_at'].isoformat() if lr['approved_at'] else None,
                'rejection_reason': lr['rejection_reason'],
                'created_at': lr['created_at'].isoformat() if lr['created_at'] else None,
                'updated_at': lr['updated_at'].isoformat() if lr['updated_at'] else None,
            } for lr in leaves]
        }), 200
        
    except Exception as e:
        print(f"Error in get_my_leave_requests: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@leaves_bp.route('/pending', methods=['GET'])
@jwt_required()
def get_pending_leave_requests():
    """Get pending leave requests (admin only)"""
    try:
        user_id = get_jwt_identity()
        
        if not is_admin(user_id):
            return jsonify({'error': 'Unauthorized. Admin access required.'}), 403
        
        with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT lr.*, u.first_name, u.last_name, u.email
                FROM leave_requests lr
                JOIN users u ON lr.user_id = u.id
                WHERE lr.status = 'pending'
                ORDER BY lr.created_at ASC
                """
            )
            leaves = cur.fetchall()
        
        return jsonify({
            'leave_requests': [{
                'id': lr['id'],
                'user_id': lr['user_id'],
                'user_name': f"{lr['first_name']} {lr['last_name']}",
                'user_email': lr['email'],
                'start_date': lr['start_date'].isoformat() if lr['start_date'] else None,
                'end_date': lr['end_date'].isoformat() if lr['end_date'] else None,
                'leave_type': lr['leave_type'],
                'reason': lr['reason'],
                'status': lr['status'],
                'approved_by': lr['approved_by'],
                'approved_at': lr['approved_at'].isoformat() if lr['approved_at'] else None,
                'rejection_reason': lr['rejection_reason'],
                'created_at': lr['created_at'].isoformat() if lr['created_at'] else None,
                'updated_at': lr['updated_at'].isoformat() if lr['updated_at'] else None,
            } for lr in leaves]
        }), 200
        
    except Exception as e:
        print(f"Error in get_pending_leave_requests: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@leaves_bp.route('/<leave_id>/approve', methods=['PUT'])
@jwt_required()
def approve_leave_request(leave_id):
    """Approve or reject a leave request (admin only)"""
    try:
        user_id = get_jwt_identity()
        
        if not is_admin(user_id):
            return jsonify({'error': 'Unauthorized. Admin access required.'}), 403
        
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        try:
            validated_data = leave_approval_schema.load(data)
        except ValidationError as err:
            return jsonify({'error': 'Validation error', 'details': err.messages}), 400
        
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Check if leave request exists
                cur.execute("SELECT * FROM leave_requests WHERE id = %s", (leave_id,))
                leave = cur.fetchone()
                
                if not leave:
                    return jsonify({'error': 'Leave request not found'}), 404
                
                if leave['status'] != 'pending':
                    return jsonify({'error': 'Leave request has already been processed'}), 400
                
                now = datetime.utcnow()
                status = validated_data['status']
                
                if status == 'approved':
                    cur.execute(
                        """
                        UPDATE leave_requests
                        SET status = 'approved',
                            approved_by = %s,
                            approved_at = %s,
                            rejection_reason = NULL,
                            updated_at = %s
                        WHERE id = %s
                        RETURNING id, user_id, start_date, end_date, leave_type, reason, status, approved_by, approved_at, rejection_reason, created_at, updated_at
                        """,
                        (user_id, now, now, leave_id)
                    )
                else:  # rejected
                    rejection_reason = validated_data.get('rejection_reason')
                    cur.execute(
                        """
                        UPDATE leave_requests
                        SET status = 'rejected',
                            approved_by = %s,
                            approved_at = %s,
                            rejection_reason = %s,
                            updated_at = %s
                        WHERE id = %s
                        RETURNING id, user_id, start_date, end_date, leave_type, reason, status, approved_by, approved_at, rejection_reason, created_at, updated_at
                        """,
                        (user_id, now, rejection_reason, now, leave_id)
                    )
                
                updated_leave = cur.fetchone()
                conn.commit()
        
        return jsonify({
            'message': f'Leave request {status} successfully',
            'leave_request': {
                'id': updated_leave['id'],
                'user_id': updated_leave['user_id'],
                'start_date': updated_leave['start_date'].isoformat() if updated_leave['start_date'] else None,
                'end_date': updated_leave['end_date'].isoformat() if updated_leave['end_date'] else None,
                'leave_type': updated_leave['leave_type'],
                'reason': updated_leave['reason'],
                'status': updated_leave['status'],
                'approved_by': updated_leave['approved_by'],
                'approved_at': updated_leave['approved_at'].isoformat() if updated_leave['approved_at'] else None,
                'rejection_reason': updated_leave['rejection_reason'],
                'created_at': updated_leave['created_at'].isoformat() if updated_leave['created_at'] else None,
                'updated_at': updated_leave['updated_at'].isoformat() if updated_leave['updated_at'] else None,
            }
        }), 200
        
    except Exception as e:
        print(f"Error in approve_leave_request: {str(e)}")
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
