import React, { useMemo, useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, UserPlusIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
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
  const [showSubtasks, setShowSubtasks] = useState(false);

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

  const subtaskCount = task.subtasks?.length ?? 0;

  return (
    <div className="rounded-xl border divider-soft bg-surface p-3 shadow-sm hover:shadow-md transition-shadow">
      {/* Compact header: title + actions */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
            {task.title}
          </h3>
          {task.description && (
            <p className="mt-1 text-xs text-muted line-clamp-2">{task.description}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => setShowAssignModal(true)}
            className="rounded-lg p-1.5 text-muted transition hover:text-foreground hover:bg-muted/50"
            title="Assign task"
          >
            <UserPlusIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowEditForm(true)}
            className="rounded-lg p-1.5 text-muted transition hover:text-foreground hover:bg-muted/50"
            title="Edit task"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="rounded-lg p-1.5 text-muted transition hover:text-rose-500 hover:bg-rose-500/10"
            title="Delete task"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Meta row: priority, status, due date, assignees */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={task.priority}
          onChange={(e) => handlePriorityChange(e.target.value)}
          style={resolvePriorityOptionStyle(task.priority)}
          className="px-2 py-0.5 rounded-md text-[10px] font-semibold border border-transparent cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-500/40"
        >
          <option value="low" style={resolvePriorityOptionStyle('low')}>Low</option>
          <option value="medium" style={resolvePriorityOptionStyle('medium')}>Medium</option>
          <option value="high" style={resolvePriorityOptionStyle('high')}>High</option>
        </select>
        <select
          value={task.status}
          onChange={(e) => handleStatusChange(e.target.value)}
          style={resolveStatusOptionStyle(task.status)}
          className="px-2 py-0.5 rounded-md text-[10px] font-semibold border border-transparent cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary-500/40"
        >
          <option value="todo" style={resolveStatusOptionStyle('todo')}>To Do</option>
          <option value="in_progress" style={resolveStatusOptionStyle('in_progress')}>In Progress</option>
          <option value="completed" style={resolveStatusOptionStyle('completed')}>Completed</option>
        </select>
        {task.due_date && (
          <span className="text-[10px] text-muted">
            Due {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
        {task.assignments?.length > 0 && (
          <div className="flex items-center -space-x-1.5 ml-auto">
            {task.assignments.slice(0, 3).map((assignment) => (
              <UserAvatar
                key={assignment.user_id || assignment.id}
                user={assignment}
                size="sm"
              />
            ))}
            {task.assignments.length > 3 && (
              <span className="text-[10px] text-muted pl-1">+{task.assignments.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Show / Hide Subtasks toggle */}
      <div className="mt-3 pt-3 border-t border-border/60">
        <button
          type="button"
          onClick={() => setShowSubtasks((v) => !v)}
          className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:text-primary-700 transition"
        >
          {showSubtasks ? (
            <ChevronDownIcon className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 shrink-0" />
          )}
          <span>{showSubtasks ? 'Hide Subtasks' : 'Show Subtasks'}</span>
          {subtaskCount > 0 && (
            <span className="text-muted font-normal">({subtaskCount})</span>
          )}
        </button>

        {showSubtasks && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Subtasks</span>
              <button
                onClick={() => setShowSubtaskForm(true)}
                className="flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add Subtask
              </button>
            </div>
            <div className="space-y-2">
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
                <p className="text-xs italic text-muted py-1">No subtasks yet</p>
              )}
            </div>
          </div>
        )}
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
