import React, { useState } from 'react';
import { PencilIcon, TrashIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import AssignModal from './AssignModal';

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
              <div className="flex flex-wrap gap-1">
                {subtask.assignments.map((assignment) => (
                  <span
                    key={assignment.id}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {assignment.user?.first_name} {assignment.user?.last_name}
                  </span>
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
        <div className="mt-3 p-3 bg-white rounded border">
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = {
              title: formData.get('title'),
              description: formData.get('description'),
              status: formData.get('status'),
              priority: formData.get('priority'),
              due_date: formData.get('due_date') ? new Date(formData.get('due_date')).toISOString() : null,
            };
            onUpdate(subtask.id, data);
            setShowEditForm(false);
          }}>
            <div className="space-y-2">
              <input
                type="text"
                name="title"
                defaultValue={subtask.title}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Subtask title"
              />
              <textarea
                name="description"
                defaultValue={subtask.description}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                placeholder="Description"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  name="status"
                  defaultValue={subtask.status}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
                <select
                  name="priority"
                  defaultValue={subtask.priority}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <input
                type="date"
                name="due_date"
                defaultValue={subtask.due_date ? new Date(subtask.due_date).toISOString().split('T')[0] : ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEditForm(false)}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                  Save
                </button>
              </div>
            </div>
          </form>
        </div>
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
