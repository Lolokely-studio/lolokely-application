import React, { useMemo, useState } from 'react';
import { PencilIcon, TrashIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import AssignModal from './AssignModal';
import UserAvatar from './UserAvatar';
import SubtaskForm from './SubtaskForm';
import { useTheme } from '../contexts/ThemeContext';

const SubtaskCard = ({ subtask, users, onUpdate, onDelete, onAssign }) => {
  const { theme } = useTheme();
  const [showEditForm, setShowEditForm] = useState(false);
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

  // Helpers
  const resolveStatusOptionStyle = (value) => {
    const palette = statusOptionStyles[value] || statusOptionStyles.default;
    return theme === 'dark' ? palette.dark : palette.light;
  };

  const resolvePriorityOptionStyle = (value) => {
    const palette = priorityOptionStyles[value] || priorityOptionStyles.default;
    return theme === 'dark' ? palette.dark : palette.light;
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

          {/* ✅ STATUS + PRIORITY with correct dark mode styling */}
          <div className="mb-2 flex items-center space-x-3">
            {/* STATUS */}
            <select
              value={subtask.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              style={resolveStatusOptionStyle(subtask.status)}
              className="px-3 py-1 rounded-full text-xs font-bold border border-transparent shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            >
              <option value="todo" style={resolveStatusOptionStyle('todo')}>To Do</option>
              <option value="in_progress" style={resolveStatusOptionStyle('in_progress')}>In Progress</option>
              <option value="completed" style={resolveStatusOptionStyle('completed')}>Completed</option>
            </select>

            {/* PRIORITY */}
            <select
              value={subtask.priority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              style={resolvePriorityOptionStyle(subtask.priority)}
              className="px-3 py-1 rounded-full text-xs font-bold border border-transparent shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            >
              <option value="low" style={resolvePriorityOptionStyle('low')}>Low</option>
              <option value="medium" style={resolvePriorityOptionStyle('medium')}>Medium</option>
              <option value="high" style={resolvePriorityOptionStyle('high')}>High</option>
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

      {/* Edit Form */}
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

      {/* Assign Modal */}
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
