from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from schemas.task_schema import TaskSchema, SubtaskSchema
from marshmallow import ValidationError
from db import get_connection
from psycopg2.extras import RealDictCursor
import uuid
from datetime import datetime


tasks_bp = Blueprint('tasks', __name__)
task_schema = TaskSchema()
subtask_schema = SubtaskSchema()


def create_notification(cur, user_id, type, message, related_task_id=None, related_subtask_id=None, created_by_user_id=None):
    """Helper function to create a notification using the existing cursor"""
    try:
        cur.execute(
            """
            INSERT INTO notifications (id, user_id, type, message, related_task_id, related_subtask_id, created_by_user_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (str(uuid.uuid4()), user_id, type, message, related_task_id, related_subtask_id, created_by_user_id)
        )
    except Exception as e:
        print(f"Error creating notification: {str(e)}")
        import traceback
        traceback.print_exc()
        # Don't fail the request if notification creation fails


@tasks_bp.route('/', methods=['GET'])
@jwt_required()
def get_tasks():
    try:
        user_id = get_jwt_identity()
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get ALL tasks (visible to all users)
                cur.execute(
                    """
                    SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date, t.created_at, t.updated_at
                    FROM tasks t
                    ORDER BY t.created_at DESC
                    """
                )
                tasks = cur.fetchall()
                
                # Get subtasks and assignments for each task
                tasks_list = []
                for task in tasks:
                    # Get assigned users for this task
                    cur.execute(
                        """
                        SELECT u.id, u.email, u.first_name, u.last_name, ta.assigned_at
                        FROM task_assignments ta
                        JOIN users u ON u.id = ta.user_id
                        WHERE ta.task_id = %s
                        ORDER BY ta.assigned_at ASC
                        """,
                        (task['id'],)
                    )
                    task_assignments = cur.fetchall()
                    
                    # Get subtasks for this task
                    cur.execute(
                        """
                        SELECT s.id, s.task_id, s.title, s.description, s.status, s.priority, s.due_date, s.created_at, s.updated_at
                        FROM subtasks s
                        WHERE s.task_id = %s
                        ORDER BY s.created_at ASC
                        """,
                        (task['id'],)
                    )
                    subtasks = cur.fetchall()
                    
                    # Get assignments for each subtask
                    subtasks_list = []
                    for subtask in subtasks:
                        cur.execute(
                            """
                            SELECT u.id, u.email, u.first_name, u.last_name, sa.assigned_at
                            FROM subtask_assignments sa
                            JOIN users u ON u.id = sa.user_id
                            WHERE sa.subtask_id = %s
                            ORDER BY sa.assigned_at ASC
                            """,
                            (subtask['id'],)
                        )
                        subtask_assignments = cur.fetchall()
                        
                        subtasks_list.append({
                            'id': subtask['id'],
                            'task_id': subtask['task_id'],
                            'title': subtask['title'],
                            'description': subtask['description'],
                            'status': subtask['status'],
                            'priority': subtask['priority'],
                            'due_date': subtask['due_date'].isoformat() if subtask['due_date'] else None,
                            'created_at': subtask['created_at'].isoformat() if subtask['created_at'] else None,
                            'updated_at': subtask['updated_at'].isoformat() if subtask['updated_at'] else None,
                            'assignments': [{
                                'user_id': a['id'],
                                'email': a['email'],
                                'first_name': a['first_name'],
                                'last_name': a['last_name'],
                                'assigned_at': a['assigned_at'].isoformat() if a['assigned_at'] else None,
                            } for a in subtask_assignments]
                        })
                    
                    tasks_list.append({
                        'id': task['id'],
                        'title': task['title'],
                        'description': task['description'],
                        'status': task['status'],
                        'priority': task['priority'],
                        'due_date': task['due_date'].isoformat() if task['due_date'] else None,
                        'created_at': task['created_at'].isoformat() if task['created_at'] else None,
                        'updated_at': task['updated_at'].isoformat() if task['updated_at'] else None,
                        'assignments': [{
                            'user_id': a['id'],
                            'email': a['email'],
                            'first_name': a['first_name'],
                            'last_name': a['last_name'],
                            'assigned_at': a['assigned_at'].isoformat() if a['assigned_at'] else None,
                        } for a in task_assignments],
                        'subtasks': subtasks_list
                    })
        
        return jsonify({'tasks': tasks_list}), 200
    except Exception as e:
        print(f"Error in get_tasks: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/', methods=['POST'])
@jwt_required()
def create_task():
    try:
        data = request.get_json()
        
        try:
            validated_data = task_schema.load(data)
        except ValidationError as err:
            return jsonify({'error': 'Validation error', 'details': err.messages}), 400
        
        user_id = get_jwt_identity()
        task_id = str(uuid.uuid4())
        now = datetime.utcnow()
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    INSERT INTO tasks (id, title, description, status, priority, due_date, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, title, description, status, priority, due_date, created_at, updated_at
                    """,
                    (
                        task_id,
                        validated_data['title'],
                        validated_data.get('description'),
                        validated_data.get('status', 'todo'),
                        validated_data.get('priority', 'medium'),
                        validated_data.get('due_date'),
                        now,
                        now,
                    ),
                )
                task = cur.fetchone()
                
                # Get creator's name for notification
                cur.execute("SELECT first_name, last_name FROM users WHERE id = %s", (user_id,))
                creator = cur.fetchone()
                creator_name = f"{creator['first_name']} {creator['last_name']}" if creator else "A user"
                
                # Create notifications for all users (except the creator)
                cur.execute("SELECT id FROM users WHERE id != %s", (user_id,))
                all_users = cur.fetchall()
                for user in all_users:
                    create_notification(
                        cur,
                        user['id'],
                        'task_created',
                        f"{creator_name} created a new task: {validated_data['title']}",
                        related_task_id=task_id,
                        created_by_user_id=user_id
                    )
                
                conn.commit()
        return jsonify({'message': 'Task created successfully', 'task': {
            'id': task['id'],
            'title': task['title'],
            'description': task['description'],
            'status': task['status'],
            'priority': task['priority'],
            'due_date': task['due_date'].isoformat() if task['due_date'] else None,
            'created_at': task['created_at'].isoformat() if task['created_at'] else None,
            'updated_at': task['updated_at'].isoformat() if task['updated_at'] else None,
        }}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/<task_id>', methods=['GET'])
@jwt_required()
def get_task(task_id):
    try:
        user_id = get_jwt_identity()
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Get task (visible to all users)
                cur.execute(
                    """
                    SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date, t.created_at, t.updated_at
                    FROM tasks t
                    WHERE t.id = %s
                    """,
                    (task_id,)
                )
                task = cur.fetchone()
                if not task:
                    return jsonify({'error': 'Task not found'}), 404
                
                # Get assigned users for this task
                cur.execute(
                    """
                    SELECT u.id, u.email, u.first_name, u.last_name, ta.assigned_at
                    FROM task_assignments ta
                    JOIN users u ON u.id = ta.user_id
                    WHERE ta.task_id = %s
                    ORDER BY ta.assigned_at ASC
                    """,
                    (task_id,)
                )
                task_assignments = cur.fetchall()
                
                # Get subtasks for this task
                cur.execute(
                    """
                    SELECT s.id, s.task_id, s.title, s.description, s.status, s.priority, s.due_date, s.created_at, s.updated_at
                    FROM subtasks s
                    WHERE s.task_id = %s
                    ORDER BY s.created_at ASC
                    """,
                    (task_id,)
                )
                subtasks = cur.fetchall()
                
                # Get assignments for each subtask
                subtasks_list = []
                for subtask in subtasks:
                    cur.execute(
                        """
                        SELECT u.id, u.email, u.first_name, u.last_name, sa.assigned_at
                        FROM subtask_assignments sa
                        JOIN users u ON u.id = sa.user_id
                        WHERE sa.subtask_id = %s
                        ORDER BY sa.assigned_at ASC
                        """,
                        (subtask['id'],)
                    )
                    subtask_assignments = cur.fetchall()
                    
                    subtasks_list.append({
                        'id': subtask['id'],
                        'task_id': subtask['task_id'],
                        'title': subtask['title'],
                        'description': subtask['description'],
                        'status': subtask['status'],
                        'priority': subtask['priority'],
                        'due_date': subtask['due_date'].isoformat() if subtask['due_date'] else None,
                        'created_at': subtask['created_at'].isoformat() if subtask['created_at'] else None,
                        'updated_at': subtask['updated_at'].isoformat() if subtask['updated_at'] else None,
                        'assignments': [{
                            'user_id': a['id'],
                            'email': a['email'],
                            'first_name': a['first_name'],
                            'last_name': a['last_name'],
                            'assigned_at': a['assigned_at'].isoformat() if a['assigned_at'] else None,
                        } for a in subtask_assignments]
                    })
                
                return jsonify({'task': {
                    'id': task['id'],
                    'title': task['title'],
                    'description': task['description'],
                    'status': task['status'],
                    'priority': task['priority'],
                    'due_date': task['due_date'].isoformat() if task['due_date'] else None,
                    'created_at': task['created_at'].isoformat() if task['created_at'] else None,
                    'updated_at': task['updated_at'].isoformat() if task['updated_at'] else None,
                    'assignments': [{
                        'user_id': a['id'],
                        'email': a['email'],
                        'first_name': a['first_name'],
                        'last_name': a['last_name'],
                        'assigned_at': a['assigned_at'].isoformat() if a['assigned_at'] else None,
                    } for a in task_assignments],
                    'subtasks': subtasks_list
                }}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/<task_id>', methods=['PUT'])
@jwt_required()
def update_task(task_id):
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        try:
            validated_data = task_schema.load(data, partial=True)
        except ValidationError as err:
            return jsonify({'error': 'Validation error', 'details': err.messages}), 400
        
        fields = []
        values = []
        for key in ['title', 'description', 'status', 'priority', 'due_date']:
            if key in validated_data:
                fields.append(f"{key} = %s")
                values.append(validated_data[key])
        if not fields:
            return jsonify({'message': 'No changes'}), 200
        values.append(datetime.utcnow())
        fields.append("updated_at = %s")
        values.append(task_id)
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"""
                    UPDATE tasks SET {', '.join(fields)}
                    WHERE id = %s
                    RETURNING id, title, description, status, priority, due_date, created_at, updated_at
                    """,
                    tuple(values),
                )
                task = cur.fetchone()
                conn.commit()
        if not task:
            return jsonify({'error': 'Task not found'}), 404
        return jsonify({'message': 'Task updated successfully', 'task': {
            'id': task['id'],
            'title': task['title'],
            'description': task['description'],
            'status': task['status'],
            'priority': task['priority'],
            'due_date': task['due_date'].isoformat() if task['due_date'] else None,
            'created_at': task['created_at'].isoformat() if task['created_at'] else None,
            'updated_at': task['updated_at'].isoformat() if task['updated_at'] else None,
        }}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/<task_id>', methods=['DELETE'])
@jwt_required()
def delete_task(task_id):
    try:
        user_id = get_jwt_identity()
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
                conn.commit()
                if cur.rowcount == 0:
                    return jsonify({'error': 'Task not found'}), 404
        return jsonify({'message': 'Task deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/<task_id>/subtasks', methods=['POST'])
@jwt_required()
def create_subtask(task_id):
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        try:
            validated_data = subtask_schema.load(data)
        except ValidationError as err:
            return jsonify({'error': 'Validation error', 'details': err.messages}), 400
        now = datetime.utcnow()
        subtask_id = str(uuid.uuid4())
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                # Check if parent task exists
                cur.execute("SELECT 1 FROM tasks WHERE id = %s", (task_id,))
                if not cur.fetchone():
                    return jsonify({'error': 'Parent task not found'}), 404
                
                cur.execute(
                    """
                    INSERT INTO subtasks (id, task_id, title, description, status, priority, due_date, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, task_id, title, description, status, priority, due_date, created_at, updated_at
                    """,
                    (
                        subtask_id,
                        task_id,
                        validated_data['title'],
                        validated_data.get('description'),
                        validated_data.get('status', 'todo'),
                        validated_data.get('priority', 'medium'),
                        validated_data.get('due_date'),
                        now,
                        now,
                    ),
                )
                subtask = cur.fetchone()
                conn.commit()
        return jsonify({'message': 'Subtask created successfully', 'subtask': {
            'id': subtask['id'],
            'task_id': subtask['task_id'],
            'title': subtask['title'],
            'description': subtask['description'],
            'status': subtask['status'],
            'priority': subtask['priority'],
            'due_date': subtask['due_date'].isoformat() if subtask['due_date'] else None,
            'created_at': subtask['created_at'].isoformat() if subtask['created_at'] else None,
            'updated_at': subtask['updated_at'].isoformat() if subtask['updated_at'] else None,
        }}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/subtasks/<subtask_id>', methods=['PUT'])
@jwt_required()
def update_subtask(subtask_id):
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        try:
            validated_data = subtask_schema.load(data, partial=True)
        except ValidationError as err:
            return jsonify({'error': 'Validation error', 'details': err.messages}), 400
        fields = []
        values = []
        for key in ['title', 'description', 'status', 'priority', 'due_date']:
            if key in validated_data:
                fields.append(f"{key} = %s")
                values.append(validated_data[key])
        if not fields:
            return jsonify({'message': 'No changes'}), 200
        values.append(datetime.utcnow())
        fields.append("updated_at = %s")
        values.append(subtask_id)
        with get_connection() as conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"""
                    UPDATE subtasks SET {', '.join(fields)}
                    WHERE id = %s
                    RETURNING id, task_id, title, description, status, priority, due_date, created_at, updated_at
                    """,
                    tuple(values),
                )
                subtask = cur.fetchone()
                conn.commit()
        if not subtask:
            return jsonify({'error': 'Subtask not found'}), 404
        return jsonify({'message': 'Subtask updated successfully', 'subtask': {
            'id': subtask['id'],
            'task_id': subtask['task_id'],
            'title': subtask['title'],
            'description': subtask['description'],
            'status': subtask['status'],
            'priority': subtask['priority'],
            'due_date': subtask['due_date'].isoformat() if subtask['due_date'] else None,
            'created_at': subtask['created_at'].isoformat() if subtask['created_at'] else None,
            'updated_at': subtask['updated_at'].isoformat() if subtask['updated_at'] else None,
        }}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/subtasks/<subtask_id>', methods=['DELETE'])
@jwt_required()
def delete_subtask(subtask_id):
    try:
        user_id = get_jwt_identity()
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM subtasks WHERE id = %s", (subtask_id,))
                conn.commit()
                if cur.rowcount == 0:
                    return jsonify({'error': 'Subtask not found'}), 404
        return jsonify({'message': 'Subtask deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/<task_id>/assign', methods=['POST'])
@jwt_required()
def assign_task(task_id):
    try:
        data = request.get_json()
        user_id = get_jwt_identity()

        if 'user_ids' not in data:
            return jsonify({'error': 'user_ids is required'}), 400
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Check if task exists
                cur.execute("SELECT 1 FROM tasks WHERE id = %s", (task_id,))
                if not cur.fetchone():
                    return jsonify({'error': 'Task not found'}), 404
                
                # Get task title and assigner name for notifications
                cur.execute("SELECT title FROM tasks WHERE id = %s", (task_id,))
                task = cur.fetchone()
                task_title = task[0] if task and task[0] else 'Task'
                
                cur.execute("SELECT first_name, last_name FROM users WHERE id = %s", (user_id,))
                assigner = cur.fetchone()
                assigner_name = f"{assigner[0]} {assigner[1]}" if assigner and assigner[0] and assigner[1] else "A user"
                
                # Remove existing assignments and add new ones
                cur.execute("DELETE FROM task_assignments WHERE task_id = %s", (task_id,))
                now = datetime.utcnow()
                for uid in data['user_ids']:
                    cur.execute(
                        "INSERT INTO task_assignments (id, task_id, user_id, assigned_at) VALUES (%s, %s, %s, %s)",
                        (str(uuid.uuid4()), task_id, uid, now),
                    )
                    # Create notification for assigned user
                    create_notification(
                        cur,
                        uid,
                        'task_assigned',
                        f"{assigner_name} assigned you to task: {task_title}",
                        related_task_id=task_id,
                        created_by_user_id=user_id
                    )
                conn.commit()
        return jsonify({'message': 'Task assigned successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@tasks_bp.route('/subtasks/<subtask_id>/assign', methods=['POST'])
@jwt_required()
def assign_subtask(subtask_id):
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        if 'user_ids' not in data:
            return jsonify({'error': 'user_ids is required'}), 400
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Check if subtask exists
                cur.execute("SELECT 1 FROM subtasks WHERE id = %s", (subtask_id,))
                if not cur.fetchone():
                    return jsonify({'error': 'Subtask not found'}), 404
                
                # Get subtask title, task_id, and assigner name for notifications
                cur.execute("SELECT title, task_id FROM subtasks WHERE id = %s", (subtask_id,))
                subtask = cur.fetchone()
                subtask_title = subtask[0] if subtask and subtask[0] else 'Subtask'
                parent_task_id = subtask[1] if subtask and len(subtask) > 1 else None
                
                cur.execute("SELECT first_name, last_name FROM users WHERE id = %s", (user_id,))
                assigner = cur.fetchone()
                assigner_name = f"{assigner[0]} {assigner[1]}" if assigner and assigner[0] and assigner[1] else "A user"
                
                # Remove existing assignments and add new ones
                cur.execute("DELETE FROM subtask_assignments WHERE subtask_id = %s", (subtask_id,))
                now = datetime.utcnow()
                for uid in data['user_ids']:
                    cur.execute(
                        "INSERT INTO subtask_assignments (id, subtask_id, user_id, assigned_at) VALUES (%s, %s, %s, %s)",
                        (str(uuid.uuid4()), subtask_id, uid, now),
                    )
                    # Create notification for assigned user
                    create_notification(
                        cur,
                        uid,
                        'subtask_assigned',
                        f"{assigner_name} assigned you to subtask: {subtask_title}",
                        related_task_id=parent_task_id,
                        related_subtask_id=subtask_id,
                        created_by_user_id=user_id
                    )
                conn.commit()
        return jsonify({'message': 'Subtask assigned successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
