import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const SubtaskForm = ({ subtask, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    title: subtask?.title || '',
    description: subtask?.description || '',
    status: subtask?.status || 'todo',
    priority: subtask?.priority || 'medium',
    due_date: subtask?.due_date ? new Date(subtask.due_date).toISOString().split('T')[0] : '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const submitData = {
      ...formData,
      due_date: formData.due_date ? new Date(formData.due_date).toISOString() : null,
    };
    onSubmit(submitData);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="glass-panel w-full max-w-md max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Entête fixe */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            {subtask ? 'Edit Subtask' : 'Create New Subtask'}
          </h2>
          <button
            onClick={onCancel}
            className="text-muted transition hover:text-foreground p-1 rounded-lg"
          >
            <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Formulaire complet avec zone centrale scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 pt-3">
          {/* Corps défilable */}
          <div className="space-y-3 sm:space-y-4 overflow-y-auto pr-1 flex-1">
            <div>
              <label htmlFor="title" className="mb-1 block text-xs sm:text-sm font-medium text-muted">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="Enter subtask title"
              />
            </div>

            <div>
              <label htmlFor="description" className="mb-1 block text-xs sm:text-sm font-medium text-muted">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={2}
                className="input-field"
                placeholder="Enter subtask description"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label htmlFor="status" className="mb-1 block text-xs sm:text-sm font-medium text-muted">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label htmlFor="priority" className="mb-1 block text-xs sm:text-sm font-medium text-muted">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="due_date" className="mb-1 block text-xs sm:text-sm font-medium text-muted">
                Due Date
              </label>
              <input
                type="date"
                id="due_date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="input-field"
              />
            </div>
          </div>

          {/* Pied de page fixe */}
          <div className="flex justify-end gap-2 sm:gap-3 pt-3 border-t border-white/10 shrink-0 mt-3">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary text-xs sm:text-sm py-1.5 sm:py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs sm:text-sm py-1.5 sm:py-2"
            >
              {subtask ? 'Update Subtask' : 'Create Subtask'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubtaskForm;