from app import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID
import uuid

class Subtask(db.Model):
    __tablename__ = 'subtasks'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id = db.Column(UUID(as_uuid=True), db.ForeignKey('tasks.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), default='todo')  # todo, in_progress, completed
    priority = db.Column(db.String(10), default='medium')  # low, medium, high
    due_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    assignments = db.relationship('SubtaskAssignment', backref='subtask', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Subtask {self.title}>'
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'task_id': str(self.task_id),
            'title': self.title,
            'description': self.description,
            'status': self.status,
            'priority': self.priority,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'assignments': [assignment.to_dict() for assignment in self.assignments]
        }
