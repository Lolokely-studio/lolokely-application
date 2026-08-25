import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { leaveService } from '../services/taskService';

const LeaveRequestForm = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    leave_type: 'vacation',
    reason: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        start_date: formData.start_date,
        end_date: formData.end_date,
      };
      await leaveService.createLeaveRequest(submitData);
      onSubmit();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details || 'Failed to create leave request');
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/40 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="glass-panel w-full max-w-md max-h-[92vh] flex flex-col p-4 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <h2 className="text-base sm:text-lg font-semibold text-foreground">
            Request Leave
          </h2>
          <button
            onClick={onCancel}
            className="text-muted transition hover:text-foreground p-1 rounded-lg"
          >
            <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {error && (
          <div className="mt-2 rounded-lg bg-red-500/10 border border-red-500/20 p-2 sm:p-3 text-xs sm:text-sm text-red-500 shrink-0">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 pt-3">
          <div className="space-y-3 sm:space-y-4 overflow-y-auto pr-1 flex-1">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label htmlFor="start_date" className="mb-1 block text-xs sm:text-sm font-medium text-muted">
                  Start Date *
                </label>
                <input
                  type="date"
                  id="start_date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleChange}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="input-field"
                />
              </div>

              <div>
                <label htmlFor="end_date" className="mb-1 block text-xs sm:text-sm font-medium text-muted">
                  End Date *
                </label>
                <input
                  type="date"
                  id="end_date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleChange}
                  required
                  min={formData.start_date || new Date().toISOString().split('T')[0]}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label htmlFor="leave_type" className="mb-1 block text-xs sm:text-sm font-medium text-muted">
                Leave Type *
              </label>
              <select
                id="leave_type"
                name="leave_type"
                value={formData.leave_type}
                onChange={handleChange}
                required
                className="input-field"
              >
                <option value="vacation">Vacation</option>
                <option value="sick">Sick Leave</option>
                <option value="personal">Personal</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="reason" className="mb-1 block text-xs sm:text-sm font-medium text-muted">
                Reason (Optional)
              </label>
              <textarea
                id="reason"
                name="reason"
                value={formData.reason}
                onChange={handleChange}
                rows={2}
                className="input-field"
                placeholder="Enter reason for leave request..."
              />
            </div>
          </div>

          <div className="flex gap-2 sm:gap-3 pt-3 border-t border-white/10 shrink-0 mt-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 btn-secondary text-xs sm:text-sm py-1.5 sm:py-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary text-xs sm:text-sm py-1.5 sm:py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LeaveRequestForm;