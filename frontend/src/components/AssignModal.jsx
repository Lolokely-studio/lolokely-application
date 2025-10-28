import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const AssignModal = ({ title, users, currentAssignments, onSubmit, onCancel }) => {
  const [selectedUsers, setSelectedUsers] = useState(
    currentAssignments.map(assignment => assignment.user_id)
  );

  const handleUserToggle = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(selectedUsers);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-3">
              Select team members to assign this task to:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {users.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => handleUserToggle(user.id)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-900">
                    {user.first_name} {user.last_name}
                  </span>
                  <span className="text-xs text-gray-500">({user.email})</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Assign
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignModal;
