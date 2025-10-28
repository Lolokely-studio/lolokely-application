from app import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID
import uuid

class TaskAssignment(db.Model):
    __tablename__ = 'task_assignments'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tasks.id'), nullable=False)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Unique constraint to prevent duplicate assignments
    __table_args__ = (db.UniqueConstraint('task_id', 'user_id', name='unique_task_user'),)
    
    def __repr__(self):
        return f'<TaskAssignment {self.task_id} -> {self.user_id}>'
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'task_id': str(self.task_id),
            'user_id': str(self.user_id),
            'assigned_at': self.assigned_at.isoformat(),
            'user': self.user.to_dict() if self.user else None
        }

class SubtaskAssignment(db.Model):
    __tablename__ = 'subtask_assignments'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subtask_id = db.Column(UUID(as_uuid=True), db.ForeignKey('subtasks.id'), nullable=False)
    user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=False)
    assigned_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Unique constraint to prevent duplicate assignments
    __table_args__ = (db.UniqueConstraint('subtask_id', 'user_id', name='unique_subtask_user'),)
    
    def __repr__(self):
        return f'<SubtaskAssignment {self.subtask_id} -> {self.user_id}>'
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'subtask_id': str(self.subtask_id),
            'user_id': str(self.user_id),
            'assigned_at': self.assigned_at.isoformat(),
            'user': self.user.to_dict() if self.user else None
        }
