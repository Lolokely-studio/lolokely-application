import React, { useMemo, useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import SubtaskCard from './SubtaskCard';
import TaskForm from './TaskForm';
import SubtaskForm from './SubtaskForm';
import AssignModal from './AssignModal';
import UserAvatar from './UserAvatar';
import { useTheme } from '../contexts/ThemeContext';

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
  const { theme } = useTheme();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  // ✅ Status styles with theme support
  const statusOptionStyles = useMemo(
    () => ({
      todo: {
        light: { backgroundColor: '#E2E8F0', color: '#111827', fontWeight: 600 },
        dark: { backgroundColor: 'rgba(148, 163, 184, 0.25)', color: '#F8FAFC', fontWeight: 600 }
      },
      in_progress: {
        light: { backgroundColor: '#FDE68A', color: '#111827', fontWeight: 600 },
        dark: { backgroundColor: 'rgba(251, 191, 36, 0.2)', color: '#F8FAFC', fontWeight: 600 }
      },
      completed: {
        light: { backgroundColor: '#BBF7D0', color: '#111827', fontWeight: 600 },
        dark: { backgroundColor: 'rgba(16, 185, 129, 0.22)', color: '#F8FAFC', fontWeight: 600 }
      },
      default: {
        light: { backgroundColor: '#E2E8F0', color: '#111827', fontWeight: 600 },
        dark: { backgroundColor: 'rgba(148, 163, 184, 0.25)', color: '#F8FAFC', fontWeight: 600 }
      }
    }),
    []
  );

  // ✅ Priority styles with theme support
  const priorityOptionStyles = useMemo(
    () => ({
      low: {
        light: { backgroundColor: '#BBF7D0', color: '#111827', fontWeight: 600 },
        dark: { backgroundColor: 'rgba(16, 185, 129, 0.22)', color: '#F8FAFC', fontWeight: 600 }
      },
      medium: {
        light: { backgroundColor: '#FDE68A', color: '#111827', fontWeight: 600 },
        dark: { backgroundColor: 'rgba(251, 191, 36, 0.2)', color: '#F8FAFC', fontWeight: 600 }
      },
      high: {
        light: { backgroundColor: '#FBCFE8', color: '#111827', fontWeight: 600 },
        dark: { backgroundColor: 'rgba(244, 114, 182, 0.25)', color: '#F8FAFC', fontWeight: 600 }
      },
      default: {
        light: { backgroundColor: '#E2E8F0', color: '#111827', fontWeight: 600 },
        dark: { backgroundColor: 'rgba(148, 163, 184, 0.25)', color: '#F8FAFC', fontWeight: 600 }
      }
    }),
    []
  );

  const resolveStatusOptionStyle = (value) => {
    const palette = statusOptionStyles[value] || statusOptionStyles.default;
    return theme === 'dark' ? palette.dark : palette.light;
  };

  const resolvePriorityOptionStyle = (value) => {
    const palette = priorityOptionStyles[value] || priorityOptionStyles.default;
    return theme === 'dark' ? palette.dark : palette.light;
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

          {/* ✅ STATUS + PRIORITY dark mode fix */}
          <div className="mb-3 flex items-center space-x-4">
            {/* STATUS */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted">Status:</span>
              <select
                value={task.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                style={resolveStatusOptionStyle(task.status)}
                className="px-3 py-1 rounded-full text-xs font-bold border border-transparent shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              >
                <option value="todo" style={resolveStatusOptionStyle('todo')}>To Do</option>
                <option value="in_progress" style={resolveStatusOptionStyle('in_progress')}>In Progress</option>
                <option value="completed" style={resolveStatusOptionStyle('completed')}>Completed</option>
              </select>
            </div>

            {/* PRIORITY */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted">Priority:</span>
              <select
                value={task.priority}
                onChange={(e) => handlePriorityChange(e.target.value)}
                style={resolvePriorityOptionStyle(task.priority)}
                className="px-3 py-1 rounded-full text-xs font-bold border border-transparent shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              >
                <option value="low" style={resolvePriorityOptionStyle('low')}>Low</option>
                <option value="medium" style={resolvePriorityOptionStyle('medium')}>Medium</option>
                <option value="high" style={resolvePriorityOptionStyle('high')}>High</option>
              </select>
            </div>
          </div>

          {task.due_date && (
            <p className="mb-3 text-sm text-muted">
              Due: {new Date(task.due_date).toLocaleDateString()}
            </p>
          )}

          {task.assignments?.length > 0 && (
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

      {/* SUBTASKS */}
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
          {task.subtasks?.length > 0 ? (
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

      {/* EDIT TASK */}
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

      {/* NEW SUBTASK */}
      {showSubtaskForm && (
        <SubtaskForm
          onSubmit={(subtaskData) => {
            onCreateSubtask(task.id, subtaskData);
            setShowSubtaskForm(false);
          }}
          onCancel={() => setShowSubtaskForm(false)}
        />
      )}

      {/* ASSIGN TASK */}
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
