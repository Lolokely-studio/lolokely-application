import React, { useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import SubtaskCard from './SubtaskCard';
import TaskForm from './TaskForm';
import SubtaskForm from './SubtaskForm';
import AssignModal from './AssignModal';
import UserAvatar from './UserAvatar';

const TaskCard = ({
  task,
  users,
  onUpdate,
  onDelete,
  onCreateSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
  onAssignTask,
  onAssignSubtask,
}) => {
  const [showEditForm, setShowEditForm] = useState(false);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
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
    onUpdate(task.id, { status: newStatus });
  };

  const handlePriorityChange = (newPriority) => {
    onUpdate(task.id, { priority: newPriority });
  };

  return (
    <div className="card">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {task.title}
          </h3>
          {task.description && (
            <p className="text-gray-600 mb-3">{task.description}</p>
          )}
          
          <div className="flex items-center space-x-4 mb-3">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Status:</span>
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Priority:</span>
              <select
                value={task.priority}
                onChange={(e) => handlePriorityChange(e.target.value)}
                className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          {task.due_date && (
            <p className="text-sm text-gray-500 mb-3">
              Due: {new Date(task.due_date).toLocaleDateString()}
            </p>
          )}

          {task.assignments && task.assignments.length > 0 && (
            <div className="mb-3">
              <span className="text-sm text-gray-500 mb-2 block">Assigned to:</span>
              <div className="flex flex-wrap gap-2 items-center">
                {task.assignments.map((assignment) => (
                  <UserAvatar
                    key={assignment.user_id || assignment.id}
                    user={assignment}
                    size="md"
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowAssignModal(true)}
            className="p-2 text-gray-400 hover:text-gray-600"
            title="Assign task"
          >
            <UserPlusIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowEditForm(true)}
            className="p-2 text-gray-400 hover:text-gray-600"
            title="Edit task"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="p-2 text-gray-400 hover:text-red-600"
            title="Delete task"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-900">Subtasks</h4>
          <button
            onClick={() => setShowSubtaskForm(true)}
            className="flex items-center space-x-1 text-sm text-primary-600 hover:text-primary-700"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Subtask</span>
          </button>
        </div>

        <div className="space-y-3">
          {task.subtasks && task.subtasks.length > 0 ? (
            task.subtasks.map((subtask) => (
              <SubtaskCard
                key={subtask.id}
                subtask={subtask}
                users={users}
                onUpdate={onUpdateSubtask}
                onDelete={onDeleteSubtask}
                onAssign={onAssignSubtask}
              />
            ))
          ) : (
            <p className="text-sm text-gray-500 italic">No subtasks yet</p>
          )}
        </div>
      </div>

      {showEditForm && (
        <TaskForm
          task={task}
          onSubmit={(taskData) => {
            onUpdate(task.id, taskData);
            setShowEditForm(false);
          }}
          onCancel={() => setShowEditForm(false)}
        />
      )}

      {showSubtaskForm && (
        <SubtaskForm
          onSubmit={(subtaskData) => {
            onCreateSubtask(task.id, subtaskData);
            setShowSubtaskForm(false);
          }}
          onCancel={() => setShowSubtaskForm(false)}
        />
      )}

      {showAssignModal && (
        <AssignModal
          title="Assign Task"
          users={users}
          currentAssignments={task.assignments || []}
          onSubmit={(userIds) => {
            onAssignTask(task.id, userIds);
            setShowAssignModal(false);
          }}
          onCancel={() => setShowAssignModal(false)}
        />
      )}
    </div>
  );
};

export default TaskCard;
