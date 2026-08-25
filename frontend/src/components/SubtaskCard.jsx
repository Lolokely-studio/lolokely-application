import React, { useMemo, useState, useRef, useEffect } from 'react';
import { PencilIcon, TrashIcon, UserPlusIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import AssignModal from './AssignModal';
import UserAvatar from './UserAvatar';
import SubtaskForm from './SubtaskForm';
import { useTheme } from '../contexts/ThemeContext';

const CustomSelect = ({ value, options, onChange, resolveStyle, theme }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [open]);

  const selected = options.find((o) => o.value === value) || options[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={resolveStyle(value)}
        className="px-3 py-1 rounded-full text-xs font-bold border border-transparent shadow-sm transition focus:outline-none focus:ring-2 focus:ring-primary-500/40 max-w-full inline-flex items-center gap-1"
      >
        <span>{selected?.label}</span>
        <ChevronDownIcon className={`h-3 w-3 shrink-0 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-[60] min-w-[120px] rounded-lg border divider-soft shadow-xl overflow-hidden py-1"
          style={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff' }}
        >
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              style={resolveStyle(opt.value)}
              className={`w-full text-left px-3 py-2 text-xs font-bold transition hover:opacity-90 ${opt.value === value ? 'ring-1 ring-inset ring-primary-500/40' : ''
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const SubtaskCard = ({ subtask, users, onUpdate, onDelete, onAssign }) => {
  const { theme } = useTheme();
  const [showEditForm, setShowEditForm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

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
    onUpdate(subtask.id, { status: newStatus });
  };

  const handlePriorityChange = (newPriority) => {
    onUpdate(subtask.id, { priority: newPriority });
  };

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
  ];

  const statusOptions = [
    { value: 'todo', label: 'To Do' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
  ];

  return (
    <div className="rounded-2xl border divider-soft bg-surface p-3 sm:p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="mb-1 font-medium text-foreground text-sm sm:text-base break-words">{subtask.title}</h4>
          {subtask.description && (
            <p className="mb-2 text-sm text-muted break-words">{subtask.description}</p>
          )}

          <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
            <CustomSelect
              value={subtask.status}
              options={statusOptions}
              onChange={handleStatusChange}
              resolveStyle={resolveStatusOptionStyle}
              theme={theme}
            />
            <CustomSelect
              value={subtask.priority}
              options={priorityOptions}
              onChange={handlePriorityChange}
              resolveStyle={resolvePriorityOptionStyle}
              theme={theme}
            />
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

        <div className="flex items-center shrink-0">
          <button
            onClick={() => setShowAssignModal(true)}
            className="rounded-lg p-2 text-muted transition hover:text-foreground"
            title="Assign subtask"
          >
            <UserPlusIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowEditForm(true)}
            className="rounded-lg p-2 text-muted transition hover:text-foreground"
            title="Edit subtask"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(subtask.id)}
            className="rounded-lg p-2 text-muted transition hover:text-rose-500"
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