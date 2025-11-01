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
    onUpdate(task.id, { status: newStatus });
  };

  const handlePriorityChange = (newPriority) => {
    onUpdate(task.id, { priority: newPriority });
  };

  return (
    <div className="card">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="mb-2 text-lg font-semibold text-foreground">
            {task.title}
          </h3>
          {task.description && (
            <p className="mb-3 text-muted">{task.description}</p>
          )}
          
          <div className="mb-3 flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted">Status:</span>
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
              <span className="text-sm text-muted">Priority:</span>
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
            <p className="mb-3 text-sm text-muted">
              Due: {new Date(task.due_date).toLocaleDateString()}
            </p>
          )}

          {task.assignments && task.assignments.length > 0 && (
            <div className="mb-3">
              <span className="mb-2 block text-sm text-muted">Assigned to:</span>
              <div className="flex flex-wrap items-center gap-2">
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
            className="rounded-xl p-2 text-muted transition hover:text-foreground"
            title="Assign task"
          >
            <UserPlusIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowEditForm(true)}
            className="rounded-xl p-2 text-muted transition hover:text-foreground"
            title="Edit task"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="rounded-xl p-2 text-muted transition hover:text-rose-500"
            title="Delete task"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="divider-soft border-t pt-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-medium text-foreground">Subtasks</h4>
          <button
            onClick={() => setShowSubtaskForm(true)}
            className="flex items-center space-x-1 text-sm font-medium text-primary-600 transition hover:text-primary-700"
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
            <p className="text-sm italic text-muted">No subtasks yet</p>
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
