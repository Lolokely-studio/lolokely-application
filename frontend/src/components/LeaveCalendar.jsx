import React, { useState, useEffect, useMemo } from 'react';
import { leaveService, userService } from '../services/taskService';
import { ChevronLeft, ChevronRight, CalendarIcon, Filter, X } from 'lucide-react';
import { Skeleton } from './Skeleton';

const LeaveCalendar = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [allLeaveRequests, setAllLeaveRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    loadLeaveRequests();
    loadUsers();
  }, []);

  useEffect(() => {
    // Filter leave requests based on selected user
    if (selectedUserId) {
      setLeaveRequests(allLeaveRequests.filter(leave => leave.user_id === selectedUserId));
    } else {
      setLeaveRequests(allLeaveRequests);
    }
  }, [selectedUserId, allLeaveRequests]);

  const loadLeaveRequests = async () => {
    try {
      setLoading(true);
      const response = await leaveService.getLeaveRequests();
      const leaves = response.leave_requests || [];
      setAllLeaveRequests(leaves);
      setLeaveRequests(leaves);
    } catch (error) {
      console.error('Error loading leave requests:', error);
    } finally {
      setLoading(false);
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

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getLeavesForDate = (date) => {
    return leaveRequests.filter(leave => {
      // Normalize dates to compare only date part (no time, no timezone)
      // Get date components in local timezone
      const dateYear = date.getFullYear();
      const dateMonth = date.getMonth();
      const dateDay = date.getDate();
      
      // Parse leave dates - they come as "YYYY-MM-DD" strings
      const startParts = leave.start_date.split('-');
      const endParts = leave.end_date.split('-');
      const startYear = parseInt(startParts[0], 10);
      const startMonth = parseInt(startParts[1], 10) - 1; // Month is 0-indexed
      const startDay = parseInt(startParts[2], 10);
      const endYear = parseInt(endParts[0], 10);
      const endMonth = parseInt(endParts[1], 10) - 1; // Month is 0-indexed
      const endDay = parseInt(endParts[2], 10);
      
      // Create date objects for comparison (in local timezone)
      const checkDate = new Date(dateYear, dateMonth, dateDay);
      const startDate = new Date(startYear, startMonth, startDay);
      const endDate = new Date(endYear, endMonth, endDay);
      
      // Compare dates (set time to midnight for accurate comparison)
      checkDate.setHours(0, 0, 0, 0);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      return checkDate >= startDate && checkDate <= endDate;
    });
  };

  const calendarDays = useMemo(() => {
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push(date);
    }
    
    return days;
  }, [year, month, startingDayOfWeek, daysInMonth]);

  const previousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const getLeaveTypeColor = (leaveType) => {
    const colors = {
      vacation: 'bg-blue-500/20 border-blue-500/30 text-blue-500',
      sick: 'bg-red-500/20 border-red-500/30 text-red-500',
      personal: 'bg-purple-500/20 border-purple-500/30 text-purple-500',
      other: 'bg-gray-500/20 border-gray-500/30 text-gray-500',
    };
    return colors[leaveType] || colors.other;
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <Skeleton className="h-10 w-48 rounded-lg" />
        </div>
        <div role="status" className="glass-panel p-6">
          <span className="sr-only">Loading…</span>
          <div className="mb-6 flex items-center justify-between">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={`h-${i}`} className="h-6 w-full" />
            ))}
            {Array.from({ length: 35 }, (_, i) => (
              <Skeleton key={i} className="aspect-square w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Team Leave Calendar</h1>
          <p className="text-sm text-muted">View all approved leave requests for the team</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted" />
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="input-field min-w-[200px]"
            >
              <option value="">All Team Members</option>
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
      </div>

      <div className="glass-panel p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={previousMonth}
            className="flex items-center justify-center h-10 w-10 rounded-lg transition hover:bg-primary-500/10"
          >
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </button>
          <h2 className="text-xl font-semibold text-foreground">
            {monthNames[month]} {year}
          </h2>
          <button
            onClick={nextMonth}
            className="flex items-center justify-center h-10 w-10 rounded-lg transition hover:bg-primary-500/10"
          >
            <ChevronRight className="h-5 w-5 text-foreground" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day Headers */}
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-muted py-2"
            >
              {day}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarDays.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dayLeaves = getLeavesForDate(date);
            const isToday = date.toDateString() === new Date().toDateString();
            const isCurrentMonth = date.getMonth() === month;

            return (
              <div
                key={date.toISOString()}
                className={`aspect-square p-1 border rounded-lg transition ${
                  isToday
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-surface-card-border'
                } ${
                  !isCurrentMonth ? 'opacity-40' : ''
                }`}
              >
                <div className="text-xs font-medium text-foreground mb-1">
                  {date.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayLeaves.slice(0, 2).map((leave) => (
                    <div
                      key={leave.id}
                      className={`text-[10px] px-1 py-0.5 rounded border truncate ${getLeaveTypeColor(leave.leave_type)}`}
                      title={`${leave.user_name}: ${leave.leave_type}`}
                    >
                      {leave.user_name.split(' ')[0]}
                    </div>
                  ))}
                  {dayLeaves.length > 2 && (
                    <div className="text-[10px] text-muted px-1">
                      +{dayLeaves.length - 2} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-6 border-t divider-soft">
          <h3 className="text-sm font-semibold text-foreground mb-3">Legend</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border bg-blue-500/20 border-blue-500/30"></div>
              <span className="text-sm text-muted">Vacation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border bg-red-500/20 border-red-500/30"></div>
              <span className="text-sm text-muted">Sick Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border bg-purple-500/20 border-purple-500/30"></div>
              <span className="text-sm text-muted">Personal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border bg-gray-500/20 border-gray-500/30"></div>
              <span className="text-sm text-muted">Other</span>
            </div>
          </div>
        </div>

        {/* Leave List */}
        <div className="mt-6 pt-6 border-t divider-soft">
          <h3 className="text-sm font-semibold text-foreground mb-3">
            {selectedUserId ? 'Filtered ' : ''}Upcoming Leaves
          </h3>
          <div className="space-y-2">
            {leaveRequests
              .filter(leave => new Date(leave.start_date) >= new Date())
              .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
              .slice(0, 10)
              .map((leave) => (
                <div
                  key={leave.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-primary-500/5"
                >
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="h-4 w-4 text-muted" />
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {leave.user_name}
                      </div>
                      <div className="text-xs text-muted">
                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded capitalize ${getLeaveTypeColor(leave.leave_type)}`}>
                    {leave.leave_type}
                  </span>
                </div>
              ))}
            {leaveRequests.filter(leave => new Date(leave.start_date) >= new Date()).length === 0 && (
              <p className="text-sm text-muted text-center py-4">No upcoming leaves</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LeaveCalendar;
