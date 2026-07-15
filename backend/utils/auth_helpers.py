from flask import jsonify
from flask_jwt_extended import get_jwt_identity
from db import get_connection
from psycopg2.extras import RealDictCursor
from psycopg2 import IntegrityError
import traceback


def is_admin(user_id):
    with get_connection() as conn, conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT is_admin FROM users WHERE id = %s", (user_id,))
        user = cur.fetchone()
        return bool(user and user.get("is_admin"))


def require_admin():
    """Return (user_id, None) if admin, else (None, (jsonify(...), status))."""
    user_id = get_jwt_identity()
    if not is_admin(user_id):
        return None, (jsonify({"error": "Administrator privileges required"}), 403)
    return user_id, None


def api_error_from_exception(e, context='request'):
    """Map DB/app exceptions to safe API responses (no raw psycopg2 leak on 500)."""
    print(f"Error in {context}: {str(e)}")
    traceback.print_exc()
    if isinstance(e, IntegrityError):
        return jsonify({'error': 'Invalid data — database constraint violated'}), 400
    return jsonify({'error': 'An unexpected error occurred'}), 500
