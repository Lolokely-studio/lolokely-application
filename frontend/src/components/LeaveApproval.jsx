import React, { useState, useEffect } from 'react';
import { leaveService, userService } from '../services/taskService';
import { CalendarIcon, CheckCircleIcon, XCircleIcon, ClockIcon, UserIcon, History, Filter, X } from 'lucide-react';

const LeaveApproval = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [historyRequests, setHistoryRequests] = useState([]);
  const [allHistoryRequests, setAllHistoryRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState({});

  useEffect(() => {
    loadPendingRequests();
    loadUsers();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  // Filter history requests based on selected user
  useEffect(() => {
    if (selectedUserId) {
      setHistoryRequests(allHistoryRequests.filter(request => request.user_id === selectedUserId));
    } else {
      setHistoryRequests(allHistoryRequests);
    }
  }, [selectedUserId, allHistoryRequests]);

  const loadPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await leaveService.getPendingLeaveRequests();
      setPendingRequests(response.leave_requests || []);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async () => {
    try {
      setHistoryLoading(true);
      const response = await leaveService.getLeaveHistory();
      const requests = response.leave_requests || [];
      setAllHistoryRequests(requests);
      setHistoryRequests(requests);
    } catch (error) {
      console.error('Error loading leave history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const response = await userService.getUsers();
      setUsers(response.users || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleApprove = async (leaveId) => {
    try {
      setProcessingId(leaveId);
      await leaveService.approveLeaveRequest(leaveId, { status: 'approved' });
      await loadPendingRequests();
      // Reload history if we're on that tab
      if (activeTab === 'history') {
        await loadHistory();
      }
    } catch (error) {
      console.error('Error approving leave request:', error);
      alert(error.response?.data?.error || 'Failed to approve leave request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (leaveId) => {
    const reason = rejectionReason[leaveId] || '';
    if (!reason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    try {
      setProcessingId(leaveId);
      await leaveService.approveLeaveRequest(leaveId, {
        status: 'rejected',
        rejection_reason: reason,
      });
      setRejectionReason({ ...rejectionReason, [leaveId]: '' });
      await loadPendingRequests();
      // Reload history if we're on that tab
      if (activeTab === 'history') {
        await loadHistory();
      }
    } catch (error) {
      console.error('Error rejecting leave request:', error);
      alert(error.response?.data?.error || 'Failed to reject leave request');
    } finally {
      setProcessingId(null);
    }
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

  if (loading && activeTab === 'pending') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Leave Approval</h1>
        <p className="text-sm text-muted">Review and approve or reject leave requests</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b divider-soft">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'pending'
              ? 'text-foreground border-b-2 border-primary-500'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <ClockIcon className="h-4 w-4 inline mr-2" />
          Pending ({pendingRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'history'
              ? 'text-foreground border-b-2 border-primary-500'
              : 'text-muted hover:text-foreground'
          }`}
        >
          <History className="h-4 w-4 inline mr-2" />
          History
        </button>
      </div>

      {/* Pending Requests Tab */}
      {activeTab === 'pending' && (
        <>
          {pendingRequests.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Pending Requests</h3>
          <p className="text-sm text-muted">All leave requests have been processed.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map((request) => (
            <div key={request.id} className="glass-panel p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <UserIcon className="h-5 w-5 text-muted" />
                    <h3 className="text-lg font-semibold text-foreground">
                      {request.user_name}
                    </h3>
                    <span className="text-sm text-muted">({request.user_email})</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted mb-2">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      {formatDate(request.start_date)} - {formatDate(request.end_date)}
                    </span>
                    <span>{calculateDays(request.start_date, request.end_date)} day(s)</span>
                    <span className="capitalize">{request.leave_type} Leave</span>
                  </div>
                  {request.reason && (
                    <p className="text-sm text-muted mb-3 bg-primary-500/5 p-3 rounded-lg">
                      <strong>Reason:</strong> {request.reason}
                    </p>
                  )}
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border bg-yellow-500/10 border-yellow-500/20 text-yellow-500">
                  <ClockIcon className="h-3.5 w-3.5" />
                  Pending
                </span>
              </div>

              <div className="mt-4 pt-4 border-t divider-soft">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-muted mb-2">
                    Rejection Reason (required if rejecting):
                  </label>
                  <textarea
                    value={rejectionReason[request.id] || ''}
                    onChange={(e) =>
                      setRejectionReason({ ...rejectionReason, [request.id]: e.target.value })
                    }
                    rows={2}
                    className="input-field w-full"
                    placeholder="Enter reason for rejection..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(request.id)}
                    disabled={processingId === request.id}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <CheckCircleIcon className="h-4 w-4" />
                    {processingId === request.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleReject(request.id)}
                    disabled={processingId === request.id || !rejectionReason[request.id]?.trim()}
                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <XCircleIcon className="h-4 w-4" />
                    {processingId === request.id ? 'Processing...' : 'Reject'}
                  </button>
                </div>
              </div>

              <p className="text-xs text-muted mt-3">
                Requested on {formatDate(request.created_at)}
              </p>
            </div>
          ))}
        </div>
      )}
      </>)}

      {/* History Tab */}
      {activeTab === 'history' && (
        <>
          {/* Filter Section */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted" />
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="input-field min-w-[200px]"
                >
                  <option value="">All Users</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedUserId && (
                <button
                  onClick={() => setSelectedUserId('')}
                  className="flex items-center justify-center h-10 w-10 rounded-lg transition hover:bg-primary-500/10"
                  title="Clear filter"
                >
                  <X className="h-4 w-4 text-muted" />
                </button>
              )}
            </div>
            {selectedUserId && (
              <span className="text-sm text-muted">
                Showing {historyRequests.length} of {allHistoryRequests.length} requests
              </span>
            )}
          </div>

          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : historyRequests.length === 0 ? (
            <div className="glass-panel p-12 text-center">
              <History className="h-12 w-12 text-muted mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {selectedUserId ? 'No Results' : 'No History'}
              </h3>
              <p className="text-sm text-muted">
                {selectedUserId 
                  ? 'No processed leave requests found for the selected user.'
                  : 'No processed leave requests yet.'}
              </p>
              {selectedUserId && (
                <button
                  onClick={() => setSelectedUserId('')}
                  className="mt-4 text-sm text-primary-500 hover:text-primary-600"
                >
                  Clear filter
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {historyRequests.map((request) => (
                <div key={request.id} className="glass-panel p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <UserIcon className="h-5 w-5 text-muted" />
                        <h3 className="text-lg font-semibold text-foreground">
                          {request.user_name}
                        </h3>
                        <span className="text-sm text-muted">({request.user_email})</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted mb-2">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          {formatDate(request.start_date)} - {formatDate(request.end_date)}
                        </span>
                        <span>{calculateDays(request.start_date, request.end_date)} day(s)</span>
                        <span className="capitalize">{request.leave_type} Leave</span>
                      </div>
                      {request.reason && (
                        <p className="text-sm text-muted mb-3 bg-primary-500/5 p-3 rounded-lg">
                          <strong>Reason:</strong> {request.reason}
                        </p>
                      )}
                      {request.status === 'rejected' && request.rejection_reason && (
                        <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                          <p className="text-sm text-red-500">
                            <strong>Rejection Reason:</strong> {request.rejection_reason}
                          </p>
                        </div>
                      )}
                      {request.approver_name && (
                        <p className="text-xs text-muted mt-2">
                          Processed by {request.approver_name} on {formatDate(request.approved_at)}
                        </p>
                      )}
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                  <p className="text-xs text-muted mt-3">
                    Requested on {formatDate(request.created_at)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LeaveApproval;
