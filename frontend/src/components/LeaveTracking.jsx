import React, { useState, useEffect } from 'react';
import { leaveService } from '../services/taskService';
import LeaveRequestForm from './LeaveRequestForm';
import { CalendarIcon, PlusIcon, ClockIcon, CheckCircleIcon, XCircleIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const LeaveTracking = () => {
  useAuth();
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadMyRequests();
  }, []);

  const loadMyRequests = async () => {
    try {
      setLoading(true);
      const response = await leaveService.getMyLeaveRequests();
      setMyRequests(response.leave_requests || []);
    } catch (error) {
      console.error('Error loading leave requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = () => {
    setShowForm(false);
    loadMyRequests();
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        icon: ClockIcon,
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/20',
        text: 'text-yellow-500',
        label: 'Pending',
      },
      approved: {
        icon: CheckCircleIcon,
        bg: 'bg-green-500/10',
        border: 'border-green-500/20',
        text: 'text-green-500',
        label: 'Approved',
      },
      rejected: {
        icon: XCircleIcon,
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        text: 'text-red-500',
        label: 'Rejected',
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${config.bg} ${config.border} ${config.text}`}
      >
        <Icon className="h-3.5 w-3.5" />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const calculateDays = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">My Leave Requests</h1>
          <p className="text-sm text-muted">Track and manage your leave requests</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
        >
          <PlusIcon className="h-5 w-5" />
          Request Leave
        </button>
      </div>

      {showForm && (
        <LeaveRequestForm
          onSubmit={handleFormSubmit}
          onCancel={() => setShowForm(false)}
        />
      )}

      {myRequests.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <CalendarIcon className="h-12 w-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Leave Requests</h3>
          <p className="text-sm text-muted mb-4">You haven't submitted any leave requests yet.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-600"
          >
            <PlusIcon className="h-5 w-5" />
            Request Leave
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {myRequests.map((request) => (
            <div key={request.id} className="glass-panel p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground capitalize">
                      {request.leave_type} Leave
                    </h3>
                    {getStatusBadge(request.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      {formatDate(request.start_date)} - {formatDate(request.end_date)}
                    </span>
                    <span>{calculateDays(request.start_date, request.end_date)} day(s)</span>
                  </div>
                </div>
              </div>
              
              {request.reason && (
                <p className="text-sm text-muted mb-3">{request.reason}</p>
              )}

              {request.status === 'rejected' && request.rejection_reason && (
                <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-sm text-red-500">
                    <strong>Rejection Reason:</strong> {request.rejection_reason}
                  </p>
                </div>
              )}

              {request.status === 'approved' && request.approved_at && (
                <p className="text-xs text-muted mt-3">
                  Approved on {formatDate(request.approved_at)}
                </p>
              )}

              <p className="text-xs text-muted mt-3">
                Submitted on {formatDate(request.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeaveTracking;
