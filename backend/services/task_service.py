from app import db
from models.task import Task
from models.subtask import Subtask
from models.assignment import TaskAssignment, SubtaskAssignment
from models.user import User
from datetime import datetime
import uuid

class TaskService:
    def get_user_tasks(self, user_id):
        """Get all tasks assigned to a user"""
        return Task.query.join(TaskAssignment).filter(
            TaskAssignment.user_id == user_id
        ).all()
    
    def create_task(self, task_data):
        """Create a new task"""
        task = Task(
            title=task_data['title'],
            description=task_data.get('description'),
            status=task_data.get('status', 'todo'),
            priority=task_data.get('priority', 'medium'),
            due_date=task_data.get('due_date')
        )
        
        db.session.add(task)
        db.session.commit()
        
        return task
    
    def get_task_by_id(self, task_id, user_id):
        """Get a specific task by ID (only if user is assigned)"""
        return Task.query.join(TaskAssignment).filter(
            Task.id == task_id,
            TaskAssignment.user_id == user_id
        ).first()
    
    def update_task(self, task_id, task_data, user_id):
        """Update a task (only if user is assigned)"""
        task = self.get_task_by_id(task_id, user_id)
        
        if not task:
            return None
        
        for key, value in task_data.items():
            if hasattr(task, key):
                setattr(task, key, value)
        
        task.updated_at = datetime.utcnow()
        db.session.commit()
        
        return task
    
    def delete_task(self, task_id, user_id):
        """Delete a task (only if user is assigned)"""
        task = self.get_task_by_id(task_id, user_id)
        
        if not task:
            return False
        
        db.session.delete(task)
        db.session.commit()
        
        return True
    
    def create_subtask(self, task_id, subtask_data, user_id):
        """Create a new subtask for a task"""
        # Check if user has access to the parent task
        task = self.get_task_by_id(task_id, user_id)
        
        if not task:
            return None
        
        subtask = Subtask(
            task_id=task_id,
            title=subtask_data['title'],
            description=subtask_data.get('description'),
            status=subtask_data.get('status', 'todo'),
            priority=subtask_data.get('priority', 'medium'),
            due_date=subtask_data.get('due_date')
        )
        
        db.session.add(subtask)
        db.session.commit()
        
        return subtask
    
    def update_subtask(self, subtask_id, subtask_data, user_id):
        """Update a subtask"""
        subtask = Subtask.query.join(Task).join(TaskAssignment).filter(
            Subtask.id == subtask_id,
            TaskAssignment.user_id == user_id
        ).first()
        
        if not subtask:
            return None
        
        for key, value in subtask_data.items():
            if hasattr(subtask, key):
                setattr(subtask, key, value)
        
        subtask.updated_at = datetime.utcnow()
        db.session.commit()
        
        return subtask
    
    def delete_subtask(self, subtask_id, user_id):
        """Delete a subtask"""
        subtask = Subtask.query.join(Task).join(TaskAssignment).filter(
            Subtask.id == subtask_id,
            TaskAssignment.user_id == user_id
        ).first()
        
        if not subtask:
            return False
        
        db.session.delete(subtask)
        db.session.commit()
        
        return True
    
    def assign_task(self, task_id, user_ids, current_user_id):
        """Assign a task to multiple users"""
        task = self.get_task_by_id(task_id, current_user_id)
        
        if not task:
            return False
        
        # Remove existing assignments
        TaskAssignment.query.filter_by(task_id=task_id).delete()
        
        # Add new assignments
        for user_id in user_ids:
            assignment = TaskAssignment(task_id=task_id, user_id=user_id)
            db.session.add(assignment)
        
        db.session.commit()
        
        return True
    
    def assign_subtask(self, subtask_id, user_ids, current_user_id):
        """Assign a subtask to multiple users"""
        subtask = Subtask.query.join(Task).join(TaskAssignment).filter(
            Subtask.id == subtask_id,
            TaskAssignment.user_id == current_user_id
        ).first()
        
        if not subtask:
            return False
        
        # Remove existing assignments
        SubtaskAssignment.query.filter_by(subtask_id=subtask_id).delete()
        
        # Add new assignments
        for user_id in user_ids:
            assignment = SubtaskAssignment(subtask_id=subtask_id, user_id=user_id)
            db.session.add(assignment)
        
        db.session.commit()
        
        return True
