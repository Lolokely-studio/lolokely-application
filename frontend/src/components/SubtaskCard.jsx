import React, { useState } from 'react';
import { PencilIcon, TrashIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import AssignModal from './AssignModal';
import UserAvatar from './UserAvatar';
import SubtaskForm from './SubtaskForm';

const SubtaskCard = ({ subtask, users, onUpdate, onDelete, onAssign }) => {
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  const getStatusColor = (status) => {
    switch (status) {
      case 'todo':
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-200';
      case 'in_progress':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-200';
      case 'completed':
        return 'bg-primary-500/20 text-primary-700 dark:text-primary-100';
      default:
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low':
        return 'bg-primary-500/15 text-primary-700 dark:text-primary-200';
      case 'medium':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-200';
      case 'high':
        return 'bg-rose-500/20 text-rose-700 dark:text-rose-200';
      default:
        return 'bg-slate-500/10 text-slate-700 dark:text-slate-200';
    }
  };

  const handleStatusChange = (newStatus) => {
    onUpdate(subtask.id, { status: newStatus });
  };

  const handlePriorityChange = (newPriority) => {
    onUpdate(subtask.id, { priority: newPriority });
  };

  return (
    <div className="rounded-2xl border divider-soft bg-surface p-4">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          <h4 className="mb-1 font-medium text-foreground">{subtask.title}</h4>
          {subtask.description && (
            <p className="mb-2 text-sm text-muted">{subtask.description}</p>
          )}
          
          <div className="mb-2 flex items-center space-x-3">
            <select
              value={subtask.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(subtask.status)}`}
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            
            <select
              value={subtask.priority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(subtask.priority)}`}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          {subtask.due_date && (
            <p className="mb-2 text-xs text-muted">
              Due: {new Date(subtask.due_date).toLocaleDateString()}
            </p>
          )}

          {subtask.assignments && subtask.assignments.length > 0 && (
            <div className="mb-2">
              <span className="mb-1 block text-xs text-muted">Assigned to:</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {subtask.assignments.map((assignment) => (
                  <UserAvatar
                    key={assignment.user_id || assignment.id}
                    user={assignment}
                    size="sm"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowAssignModal(true)}
            className="rounded-lg p-1.5 text-muted transition hover:text-foreground"
            title="Assign subtask"
          >
            <UserPlusIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowEditForm(true)}
            className="rounded-lg p-1.5 text-muted transition hover:text-foreground"
            title="Edit subtask"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(subtask.id)}
            className="rounded-lg p-1.5 text-muted transition hover:text-rose-500"
            title="Delete subtask"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {showEditForm && (
        <SubtaskForm
          subtask={subtask}
          onSubmit={(subtaskData) => {
            onUpdate(subtask.id, subtaskData);
            setShowEditForm(false);
          }}
          onCancel={() => setShowEditForm(false)}
        />
      )}

      {showAssignModal && (
        <AssignModal
          title="Assign Subtask"
          users={users}
          currentAssignments={subtask.assignments || []}
          onSubmit={(userIds) => {
            onAssign(subtask.id, userIds);
            setShowAssignModal(false);
          }}
          onCancel={() => setShowAssignModal(false)}
        />
      )}
    </div>
  );
};

export default SubtaskCard;
