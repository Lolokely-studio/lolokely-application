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
        return 'bg-gray-100 text-gray-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusChange = (newStatus) => {
    onUpdate(subtask.id, { status: newStatus });
  };

  const handlePriorityChange = (newPriority) => {
    onUpdate(subtask.id, { priority: newPriority });
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-1">{subtask.title}</h4>
          {subtask.description && (
            <p className="text-sm text-gray-600 mb-2">{subtask.description}</p>
          )}
          
          <div className="flex items-center space-x-3 mb-2">
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
            <p className="text-xs text-gray-500 mb-2">
              Due: {new Date(subtask.due_date).toLocaleDateString()}
            </p>
          )}

          {subtask.assignments && subtask.assignments.length > 0 && (
            <div className="mb-2">
              <span className="text-xs text-gray-500 mb-1 block">Assigned to:</span>
              <div className="flex flex-wrap gap-1.5 items-center">
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
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Assign subtask"
          >
            <UserPlusIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowEditForm(true)}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Edit subtask"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(subtask.id)}
            className="p-1 text-gray-400 hover:text-red-600"
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
