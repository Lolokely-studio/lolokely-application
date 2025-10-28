from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from models.user import User
from models.task import Task
from models.subtask import Subtask
from models.assignment import TaskAssignment, SubtaskAssignment
from services.task_service import TaskService
from schemas.task_schema import TaskSchema, SubtaskSchema
from marshmallow import ValidationError

tasks_bp = Blueprint('tasks', __name__)
task_service = TaskService()
task_schema = TaskSchema()
subtask_schema = SubtaskSchema()

@tasks_bp.route('/', methods=['GET'])
@jwt_required()
def get_tasks():
    try:
        user_id = get_jwt_identity()
        tasks = task_service.get_user_tasks(user_id)
        
        return jsonify({
            'tasks': [task.to_dict() for task in tasks]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tasks_bp.route('/', methods=['POST'])
@jwt_required()
def create_task():
    try:
        data = request.get_json()
        
        # Validate input data
        try:
            validated_data = task_schema.load(data)
        except ValidationError as err:
            return jsonify({'error': 'Validation error', 'details': err.messages}), 400
        
        # Create task
        task = task_service.create_task(validated_data)
        
        return jsonify({
            'message': 'Task created successfully',
            'task': task.to_dict()
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tasks_bp.route('/<task_id>', methods=['GET'])
@jwt_required()
def get_task(task_id):
    try:
        user_id = get_jwt_identity()
        task = task_service.get_task_by_id(task_id, user_id)
        
        if not task:
            return jsonify({'error': 'Task not found'}), 404
        
        return jsonify({'task': task.to_dict()}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tasks_bp.route('/<task_id>', methods=['PUT'])
@jwt_required()
def update_task(task_id):
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        # Validate input data
        try:
            validated_data = task_schema.load(data, partial=True)
        except ValidationError as err:
            return jsonify({'error': 'Validation error', 'details': err.messages}), 400
        
        # Update task
        task = task_service.update_task(task_id, validated_data, user_id)
        
        if not task:
            return jsonify({'error': 'Task not found'}), 404
        
        return jsonify({
            'message': 'Task updated successfully',
            'task': task.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tasks_bp.route('/<task_id>', methods=['DELETE'])
@jwt_required()
def delete_task(task_id):
    try:
        user_id = get_jwt_identity()
        success = task_service.delete_task(task_id, user_id)
        
        if not success:
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
        
        # Validate input data
        try:
            validated_data = subtask_schema.load(data)
        except ValidationError as err:
            return jsonify({'error': 'Validation error', 'details': err.messages}), 400
        
        # Create subtask
        subtask = task_service.create_subtask(task_id, validated_data, user_id)
        
        if not subtask:
            return jsonify({'error': 'Parent task not found'}), 404
        
        return jsonify({
            'message': 'Subtask created successfully',
            'subtask': subtask.to_dict()
        }), 201
        
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
        
        # Assign task to users
        success = task_service.assign_task(task_id, data['user_ids'], user_id)
        
        if not success:
            return jsonify({'error': 'Task not found'}), 404
        
        return jsonify({'message': 'Task assigned successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tasks_bp.route('/subtasks/<subtask_id>', methods=['PUT'])
@jwt_required()
def update_subtask(subtask_id):
    try:
        data = request.get_json()
        user_id = get_jwt_identity()
        
        # Validate input data
        try:
            validated_data = subtask_schema.load(data, partial=True)
        except ValidationError as err:
            return jsonify({'error': 'Validation error', 'details': err.messages}), 400
        
        # Update subtask
        subtask = task_service.update_subtask(subtask_id, validated_data, user_id)
        
        if not subtask:
            return jsonify({'error': 'Subtask not found'}), 404
        
        return jsonify({
            'message': 'Subtask updated successfully',
            'subtask': subtask.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tasks_bp.route('/subtasks/<subtask_id>', methods=['DELETE'])
@jwt_required()
def delete_subtask(subtask_id):
    try:
        user_id = get_jwt_identity()
        success = task_service.delete_subtask(subtask_id, user_id)
        
        if not success:
            return jsonify({'error': 'Subtask not found'}), 404
        
        return jsonify({'message': 'Subtask deleted successfully'}), 200
        
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
        
        # Assign subtask to users
        success = task_service.assign_subtask(subtask_id, data['user_ids'], user_id)
        
        if not success:
            return jsonify({'error': 'Subtask not found'}), 404
        
        return jsonify({'message': 'Subtask assigned successfully'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
