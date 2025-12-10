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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div
        className="glass-panel mx-4 w-full max-w-md px-6 py-6 sm:px-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Request Leave
          </h2>
          <button
            onClick={onCancel}
            className="text-muted transition hover:text-foreground"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-500">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="start_date" className="mb-1 block text-sm font-medium text-muted">
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
            <label htmlFor="end_date" className="mb-1 block text-sm font-medium text-muted">
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

          <div>
            <label htmlFor="leave_type" className="mb-1 block text-sm font-medium text-muted">
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
            <label htmlFor="reason" className="mb-1 block text-sm font-medium text-muted">
              Reason (Optional)
            </label>
            <textarea
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              rows={4}
              className="input-field"
              placeholder="Enter reason for leave request..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-lg border px-4 py-2 text-sm font-semibold transition"
              style={{
                background: 'var(--surface-card)',
                borderColor: 'var(--surface-card-border)',
                color: 'var(--text-primary)',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
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
