import React, { useState, useEffect, useMemo } from 'react';
import { leaveService } from '../services/taskService';
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';

const LeaveCalendar = () => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    loadLeaveRequests();
  }, []);

  const loadLeaveRequests = async () => {
    try {
      setLoading(true);
      const response = await leaveService.getLeaveRequests();
      setLeaveRequests(response.leave_requests || []);
    } catch (error) {
      console.error('Error loading leave requests:', error);
    } finally {
      setLoading(false);
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
      const start = new Date(leave.start_date);
      const end = new Date(leave.end_date);
      return date >= start && date <= end;
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">Team Leave Calendar</h1>
        <p className="text-sm text-muted">View all approved leave requests for the team</p>
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
          <h3 className="text-sm font-semibold text-foreground mb-3">Upcoming Leaves</h3>
          <div className="space-y-2">
            {leaveRequests
              .filter(leave => new Date(leave.start_date) >= new Date())
              .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
              .slice(0, 5)
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
