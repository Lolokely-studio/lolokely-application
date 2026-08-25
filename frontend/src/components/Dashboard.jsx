import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { taskService, userService } from '../services/taskService';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import UserList from './UserList';
import { Skeleton, SkeletonText } from './Skeleton';
import { MagnifyingGlassIcon, XMarkIcon, FunnelIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const getStartEnd = (item) => {
  const end = new Date(item.due_date);
  end.setHours(23, 59, 59, 999);
  const start = item.created_at
    ? new Date(item.created_at)
    : new Date(item.due_date);
  start.setHours(0, 0, 0, 0);
  if (start > end) start.setTime(end.getTime());
  return { start, end };
};

const Dashboard = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [showGanttView, setShowGanttView] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksResponse, usersResponse] = await Promise.all([
        taskService.getTasks(),
        userService.getUsers(),
      ]);
      setTasks(tasksResponse.tasks);
      setUsers(usersResponse.users);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (taskData) => {
    try {
      const response = await taskService.createTask(taskData);
      setTasks([...tasks, response.task]);
      setShowTaskForm(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleUpdateTask = async (taskId, taskData) => {
    try {
      const response = await taskService.updateTask(taskId, taskData);
      setTasks(tasks.map((task) => {
        if (task.id !== taskId) return task;
        return {
          ...task,
          ...response.task,
          subtasks: response.task.subtasks ?? task.subtasks,
          assignments: response.task.assignments ?? task.assignments,
        };
      }));
      setSelectedTask(null);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await taskService.deleteTask(taskId);
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleCreateSubtask = async (taskId, subtaskData) => {
    try {
      await taskService.createSubtask(taskId, subtaskData);
      loadData();
    } catch (error) {
      console.error('Error creating subtask:', error);
    }
  };

  const handleUpdateSubtask = async (subtaskId, subtaskData) => {
    try {
      await taskService.updateSubtask(subtaskId, subtaskData);
      loadData();
    } catch (error) {
      console.error('Error updating subtask:', error);
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    try {
      await taskService.deleteSubtask(subtaskId);
      loadData();
    } catch (error) {
      console.error('Error deleting subtask:', error);
    }
  };

  const handleAssignTask = async (taskId, userIds) => {
    try {
      await taskService.assignTask(taskId, userIds);
      loadData();
    } catch (error) {
      console.error('Error assigning task:', error);
    }
  };

  const handleAssignSubtask = async (subtaskId, userIds) => {
    try {
      await taskService.assignSubtask(subtaskId, userIds);
      loadData();
    } catch (error) {
      console.error('Error assigning subtask:', error);
    }
  };

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    if (selectedUserId) {
      filtered = filtered.filter(task => {
        const assignedUserIds = task.assignments?.map(a => a.user_id || a.id) || [];
        return assignedUserIds.includes(selectedUserId);
      });
    }

    if (selectedPriority) {
      filtered = filtered.filter(task => task.priority === selectedPriority);
    }

    if (selectedStatus) {
      filtered = filtered.filter(task => task.status === selectedStatus);
    }

    if (dateRangeStart && dateRangeEnd) {
      const rangeStart = new Date(dateRangeStart);
      rangeStart.setHours(0, 0, 0, 0);
      const rangeEnd = new Date(dateRangeEnd);
      rangeEnd.setHours(23, 59, 59, 999);
      if (rangeStart.getTime() > rangeEnd.getTime()) {
        const swap = rangeStart.getTime();
        rangeStart.setTime(rangeEnd.getTime());
        rangeEnd.setTime(swap);
        rangeEnd.setHours(23, 59, 59, 999);
      }

      filtered = filtered.filter((task) => {
        if (!task.due_date) return false;
        const taskEnd = new Date(task.due_date);
        taskEnd.setHours(23, 59, 59, 999);
        const taskStart = task.created_at
          ? new Date(task.created_at)
          : new Date(task.due_date);
        taskStart.setHours(0, 0, 0, 0);
        if (taskStart > taskEnd) taskStart.setTime(taskEnd.getTime());
        return taskStart <= rangeEnd && taskEnd >= rangeStart;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();

      filtered = filtered
        .map(task => {
          const taskMatches =
            task.title?.toLowerCase().includes(query) ||
            task.description?.toLowerCase().includes(query);

          const matchingSubtasks = task.subtasks?.filter(subtask =>
            subtask.title?.toLowerCase().includes(query) ||
            subtask.description?.toLowerCase().includes(query)
          ) || [];

          if (taskMatches || matchingSubtasks.length > 0) {
            return {
              ...task,
              subtasks: taskMatches ? task.subtasks : matchingSubtasks
            };
          }

          return null;
        })
        .filter(task => task !== null);
    }

    return filtered;
  }, [tasks, searchQuery, selectedUserId, selectedPriority, selectedStatus, dateRangeStart, dateRangeEnd]);

  const GanttView = ({ tasks, dateRangeStart, dateRangeEnd }) => {
    const [expandedTaskIds, setExpandedTaskIds] = useState(new Set());

    const subtaskBarColors = [
      'rgb(59 130 246)',
      'rgb(168 85 247)',
      'rgb(236 72 153)',
      'rgb(234 88 12)',
      'rgb(34 197 94)',
      'rgb(20 184 166)',
      'rgb(251 146 60)',
      'rgb(139 92 246)',
    ];

    const { rangeStart, rangeEnd, days, dayWidthPct } = useMemo(() => {
      if (dateRangeStart && dateRangeEnd) {
        let start = new Date(dateRangeStart);
        start.setHours(0, 0, 0, 0);
        let end = new Date(dateRangeEnd);
        end.setHours(0, 0, 0, 0);
        if (start.getTime() > end.getTime()) [start, end] = [end, start];
        const days = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          days.push(new Date(d));
        }
        const numDays = Math.max(1, days.length);
        return {
          rangeStart: start,
          rangeEnd: new Date(end.getTime() + ONE_DAY_MS - 1),
          days,
          dayWidthPct: 100 / numDays,
        };
      }
      const anchor = new Date();
      anchor.setHours(0, 0, 0, 0);
      const dayOfWeek = anchor.getDay();
      const diffToMonday = (dayOfWeek + 6) % 7;
      const weekStart = new Date(anchor.getTime() - diffToMonday * ONE_DAY_MS);
      const weekEnd = new Date(weekStart.getTime() + 6 * ONE_DAY_MS);
      const days = [];
      for (let i = 0; i <= 6; i++) {
        days.push(new Date(weekStart.getTime() + i * ONE_DAY_MS));
      }
      return {
        rangeStart: weekStart,
        rangeEnd: weekEnd,
        days,
        dayWidthPct: 100 / 7,
      };
    }, [dateRangeStart, dateRangeEnd]);

    const overlapsRange = (start, end) =>
      start <= rangeEnd && end >= rangeStart;

    const rangeMs = rangeEnd.getTime() - rangeStart.getTime() + ONE_DAY_MS;

    const barStyle = (start, end) => {
      const displayStart = new Date(Math.max(start.getTime(), rangeStart.getTime()));
      const displayEnd = new Date(Math.min(end.getTime(), rangeEnd.getTime()));
      displayEnd.setHours(23, 59, 59, 999);
      const left = ((displayStart.getTime() - rangeStart.getTime()) / rangeMs) * 100;
      const spanMs = Math.max(displayEnd.getTime() - displayStart.getTime(), ONE_DAY_MS - 1);
      const width = (spanMs / rangeMs) * 100;
      return { left: Math.max(0, left), width: Math.min(100 - left, Math.max(4, width)) };
    };

    const ganttTasks = useMemo(() => {
      return tasks.filter((task) => {
        if (!task.due_date) return false;
        const { start, end } = getStartEnd(task);
        return start <= rangeEnd && end >= rangeStart;
      });
    }, [tasks, rangeStart, rangeEnd]);

    const toggleExpanded = (taskId) => {
      setExpandedTaskIds((prev) => {
        const next = new Set(prev);
        if (next.has(taskId)) next.delete(taskId);
        else next.add(taskId);
        return next;
      });
    };

    if (ganttTasks.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center py-8 rounded-xl border divider-soft bg-surface">
          <div className="text-center px-4">
            <h3 className="text-base lg:text-lg font-semibold text-foreground">
              No tasks in this range
            </h3>
            <p className="text-sm text-muted mt-1">
              Add due dates to tasks or pick another date range.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 min-h-0 flex flex-col rounded-xl border divider-soft bg-surface/60 overflow-hidden">
        <div className="px-3 lg:px-4 py-2.5 lg:py-3 border-b divider-soft flex items-center justify-between shrink-0">
          <span className="text-xs lg:text-sm font-semibold text-foreground">
            Gantt View
          </span>
          <span className="text-[10px] lg:text-xs text-muted">
            {rangeStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} –{' '}
            {rangeEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <div className="min-w-[640px] px-3 lg:px-4 py-3 space-y-1">
            <div className="pl-36 lg:pl-44">
              <div className="relative h-8 border-b border-border/60">
                {days.map((date) => {
                  const isToday = new Date().toDateString() === date.toDateString();
                  const index = days.indexOf(date);
                  const left = index * dayWidthPct;
                  return (
                    <div
                      key={date.toISOString()}
                      className="absolute top-0 h-full border-l border-border/40"
                      style={{ left: `${left}%`, width: `${dayWidthPct}%` }}
                    >
                      <div className="h-full flex flex-col items-center justify-end pb-0.5">
                        <span className="text-[9px] lg:text-[10px] text-muted">
                          {date.getDate()}
                        </span>
                        {isToday && (
                          <span className="mt-0.5 inline-flex h-1.5 w-1.5 rounded-full bg-primary-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1">
              {ganttTasks.map((task) => {
                const { start: taskStart, end: taskEnd } = getStartEnd(task);
                const taskBar = barStyle(taskStart, taskEnd);
                const hasSubtasks = task.subtasks?.length > 0;
                const isExpanded = expandedTaskIds.has(task.id);
                const subtasksInRange =
                  (task.subtasks || []).filter((st) => {
                    if (!st.due_date) return false;
                    const { start, end } = getStartEnd(st);
                    return overlapsRange(start, end);
                  });

                return (
                  <div key={task.id} className="space-y-1">
                    <div className="flex items-center gap-2 lg:gap-3">
                      <div className="w-36 lg:w-44 flex items-center gap-1 min-w-0">
                        {hasSubtasks ? (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(task.id)}
                            className="p-0.5 rounded text-muted hover:text-foreground shrink-0"
                            aria-label={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
                          >
                            {isExpanded ? (
                              <ChevronDownIcon className="h-4 w-4" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4" />
                            )}
                          </button>
                        ) : (
                          <span className="w-5 shrink-0" />
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs lg:text-sm font-medium text-foreground truncate">
                            {task.title}
                          </span>
                          <span className="text-[10px] text-muted">
                            {task.created_at
                              ? `${new Date(task.created_at).toLocaleDateString()} – ${new Date(task.due_date).toLocaleDateString()}`
                              : new Date(task.due_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="relative h-6 rounded bg-muted/30 overflow-hidden">
                          <div
                            className="absolute inset-y-0 rounded bg-primary-500/90"
                            style={{ left: `${taskBar.left}%`, width: `${taskBar.width}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {hasSubtasks && isExpanded && (
                      <div className="space-y-1 pl-6 lg:pl-8">
                        {subtasksInRange.length === 0 ? (
                          <p className="text-[10px] text-muted py-1">No subtasks in this range</p>
                        ) : (
                          subtasksInRange.map((subtask, stIndex) => {
                            const { start: stStart, end: stEnd } = getStartEnd(subtask);
                            const stBar = barStyle(stStart, stEnd);
                            const barColor = subtaskBarColors[stIndex % subtaskBarColors.length];
                            return (
                              <div
                                key={subtask.id}
                                className="flex items-center gap-2 lg:gap-3"
                              >
                                <div className="w-32 lg:w-40 flex flex-col min-w-0 pl-5">
                                  <span className="text-xs font-medium text-foreground/90 truncate">
                                    {subtask.title}
                                  </span>
                                  <span className="text-[10px] text-muted">
                                    {new Date(subtask.due_date).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="relative h-5 rounded bg-muted/20 overflow-hidden">
                                    <div
                                      className="absolute inset-y-0 rounded opacity-90"
                                      style={{
                                        left: `${stBar.left}%`,
                                        width: `${stBar.width}%`,
                                        backgroundColor: barColor,
                                      }}
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="relative z-10 flex flex-col min-h-screen w-full">
        <div className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto px-3 py-4 lg:px-6 lg:py-5">
          <header className="flex-shrink-0 mb-3 lg:mb-4 space-y-3">
            <Skeleton className="h-8 w-64 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-10 w-48 rounded-xl" />
              <Skeleton className="h-10 w-32 rounded-xl" />
              <Skeleton className="h-10 w-28 rounded-xl" />
            </div>
          </header>
          <div className="flex-1 flex flex-col lg:flex-row gap-3 lg:gap-4">
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4">
              {['To Do', 'In Progress', 'Completed'].map((label) => (
                <div
                  key={label}
                  className="flex flex-col rounded-xl border divider-soft bg-surface/50 overflow-hidden min-h-[200px]"
                >
                  <div className="px-3 lg:px-4 py-2.5 lg:py-3 border-b divider-soft">
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <div className="flex-1 p-2 lg:p-3 space-y-2 lg:space-y-3">
                    {Array.from({ length: 2 }, (_, i) => (
                      <div key={i} className="rounded-xl border divider-soft bg-card p-3 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <SkeletonText lines={2} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <aside className="w-full lg:w-72 xl:w-80 space-y-3 rounded-xl border divider-soft bg-surface/50 p-4">
              <Skeleton className="h-5 w-32" />
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <Skeleton className="h-3 flex-1" />
                </div>
              ))}
            </aside>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-full">
      <div className="flex flex-col flex-1 w-full max-w-[1920px] mx-auto px-3 py-4 lg:px-6 lg:py-5">
        <header className="flex-shrink-0 mb-3 lg:mb-4">
          <div className="flex flex-col gap-3 lg:gap-4">
            <div>
              <h1 className="text-xl lg:text-2xl xl:text-3xl font-semibold text-foreground truncate">
                Welcome back, {user?.first_name}!
              </h1>
              <p className="text-xs lg:text-sm text-muted mt-0.5">
                Manage your team&apos;s tasks and stay organized.
              </p>
            </div>

            {/* Filtres : stackés jusqu'à lg, puis en ligne */}
            <div className="flex flex-col lg:flex-row gap-2 lg:gap-3 flex-1 min-w-0">
              <div className="relative flex-1 min-w-0 max-w-full lg:max-w-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 lg:pl-4">
                  <MagnifyingGlassIcon className="h-4 w-4 lg:h-5 lg:w-5 text-primary-500/70" />
                </div>
                <input
                  type="text"
                  placeholder="Search tasks or subtasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field !pl-9 !pr-10 lg:!pl-11 lg:!pr-12 !py-2.5 lg:!py-3 text-sm w-full"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 lg:pr-4 text-muted transition hover:text-foreground"
                  >
                    <XMarkIcon className="h-4 w-4 lg:h-5 lg:w-5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2 items-stretch">
                <div className="relative flex-shrink-0 min-w-0 w-full lg:w-auto">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 lg:pl-3">
                    <FunnelIcon className="h-4 w-4 lg:h-5 lg:w-5 text-primary-500/70" />
                  </div>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="input-field w-full min-w-0 lg:min-w-[120px] lg:w-36 xl:w-40 appearance-none !pl-9 !pr-9 lg:!pl-11 lg:!pr-10 text-xs lg:text-sm cursor-pointer !py-2.5"
                  >
                    <option value="">All users</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 lg:pr-3 text-muted">
                    <svg className="h-3.5 w-3.5 lg:h-4 lg:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="input-field w-full lg:w-32 appearance-none !pr-9 text-xs lg:text-sm cursor-pointer !py-2.5"
                >
                  <option value="">Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>

                <input
                  type="date"
                  value={dateRangeStart}
                  onChange={(e) => setDateRangeStart(e.target.value)}
                  className="input-field w-full lg:w-32 appearance-none text-xs lg:text-sm cursor-pointer !py-2.5"
                  title="From date"
                />
                <input
                  type="date"
                  value={dateRangeEnd}
                  onChange={(e) => setDateRangeEnd(e.target.value)}
                  className="input-field w-full lg:w-32 appearance-none text-xs lg:text-sm cursor-pointer !py-2.5"
                  title="To date"
                />

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="input-field w-full lg:w-36 xl:w-40 appearance-none !pr-9 text-xs lg:text-sm cursor-pointer !py-2.5"
                >
                  <option value="">Status</option>
                  <option value="todo">To do</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowGanttView((prev) => !prev)}
                  className={`inline-flex items-center justify-center rounded-xl border px-3 lg:px-4 text-xs lg:text-sm font-medium transition whitespace-nowrap w-full lg:w-auto ${showGanttView
                    ? 'bg-primary-600/90 text-white border-primary-500 shadow-sm'
                    : 'bg-surface text-muted hover:text-foreground border-border hover:bg-surface/80'
                    }`}
                >
                  {showGanttView ? 'Board View' : 'Gantt View'}
                </button>

                <button
                  onClick={() => setShowTaskForm(true)}
                  className="btn-primary whitespace-nowrap shrink-0 !py-2.5 w-full lg:w-auto"
                >
                  Create New Task
                </button>
              </div>
            </div>

            {(searchQuery || selectedUserId || selectedPriority || selectedStatus || dateRangeStart || dateRangeEnd) && (
              <div className="flex flex-wrap items-center gap-2">
                {searchQuery && (
                  <span className="chip text-xs">
                    Search: &quot;{searchQuery}&quot;
                    <button type="button" onClick={() => setSearchQuery('')} className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-[inherit] opacity-80 transition hover:opacity-100">
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedUserId && (
                  <span className="chip text-xs">
                    User: {users.find((u) => u.id === selectedUserId)?.first_name} {users.find((u) => u.id === selectedUserId)?.last_name}
                    <button type="button" onClick={() => setSelectedUserId('')} className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-[inherit] opacity-80 transition hover:opacity-100">
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedPriority && (
                  <span className="chip text-xs">
                    Priority: {selectedPriority.charAt(0).toUpperCase() + selectedPriority.slice(1)}
                    <button type="button" onClick={() => setSelectedPriority('')} className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-[inherit] opacity-80 transition hover:opacity-100">
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {selectedStatus && (
                  <span className="chip text-xs">
                    Status: {selectedStatus === 'in_progress' ? 'In progress' : selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}
                    <button type="button" onClick={() => setSelectedStatus('')} className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-[inherit] opacity-80 transition hover:opacity-100">
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {(dateRangeStart || dateRangeEnd) && (
                  <span className="chip text-xs">
                    Date: {dateRangeStart || '…'} – {dateRangeEnd || '…'}
                    <button
                      type="button"
                      onClick={() => { setDateRangeStart(''); setDateRangeEnd(''); }}
                      className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-[inherit] opacity-80 transition hover:opacity-100"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Contenu : stacké jusqu'à lg, puis side-by-side */}
        <div className="flex flex-col lg:flex-row gap-3 lg:gap-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
          <div className="flex flex-col gap-3 lg:flex-1 lg:min-h-0 lg:overflow-hidden min-w-0">
            {!showGanttView && (searchQuery || selectedUserId || selectedPriority || selectedStatus || dateRangeStart || dateRangeEnd) && filteredTasks.length === 0 ? (
              <div className="flex items-center justify-center py-12 rounded-xl border divider-soft bg-surface">
                <div className="text-center px-4">
                  <div className="mb-3 text-4xl lg:text-5xl text-primary-500/60">🔍</div>
                  <h3 className="text-base lg:text-lg font-semibold text-foreground">No tasks found</h3>
                  <p className="text-sm text-muted mt-1">Try adjusting your filters.</p>
                </div>
              </div>
            ) : !showGanttView && filteredTasks.length === 0 ? (
              <div className="flex items-center justify-center py-12 rounded-xl border divider-soft bg-surface">
                <div className="text-center px-4">
                  <div className="mb-3 text-4xl lg:text-5xl text-primary-500/60">📋</div>
                  <h3 className="text-base lg:text-lg font-semibold text-foreground">No tasks yet</h3>
                  <p className="text-sm text-muted mt-1">Create your first task to get started.</p>
                </div>
              </div>
            ) : showGanttView ? (
              <div className="lg:flex-1 lg:min-h-0 lg:overflow-hidden flex flex-col min-h-[400px]">
                <GanttView
                  tasks={filteredTasks}
                  dateRangeStart={dateRangeStart}
                  dateRangeEnd={dateRangeEnd}
                />
              </div>
            ) : (
              <>
                {(searchQuery || selectedUserId || selectedPriority || selectedStatus) && (
                  <p className="text-xs lg:text-sm text-muted px-0.5 shrink-0">
                    Showing {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
                  </p>
                )}

                {/* 1 colonne jusqu'à lg, 3 colonnes à partir de lg */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 lg:gap-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
                  {['todo', 'in_progress', 'completed'].map((status) => {
                    const columnTasks = filteredTasks.filter((t) => t.status === status);
                    const columnLabels = { todo: 'To Do', in_progress: 'In Progress', completed: 'Completed' };
                    return (
                      <div
                        key={status}
                        className="flex flex-col rounded-xl border divider-soft bg-surface/50 overflow-hidden min-h-[220px] lg:min-h-0 lg:h-full"
                      >
                        <div className="px-3 lg:px-4 py-2.5 lg:py-3 border-b divider-soft flex items-center justify-between shrink-0">
                          <span className="font-semibold text-foreground text-xs lg:text-sm truncate">
                            {columnLabels[status]}
                          </span>
                          <span className="text-[10px] lg:text-xs font-medium text-muted bg-muted/50 px-2 py-0.5 rounded-full shrink-0">
                            {columnTasks.length}
                          </span>
                        </div>
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 lg:p-3 space-y-2 lg:space-y-3">
                          {columnTasks.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              users={users}
                              onUpdate={handleUpdateTask}
                              onDelete={handleDeleteTask}
                              onCreateSubtask={handleCreateSubtask}
                              onUpdateSubtask={handleUpdateSubtask}
                              onDeleteSubtask={handleDeleteSubtask}
                              onAssignTask={handleAssignTask}
                              onAssignSubtask={handleAssignSubtask}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0 lg:min-h-0 lg:overflow-hidden">
            <UserList users={users} />
          </aside>
        </div>

        {showTaskForm && (
          <TaskForm
            onSubmit={handleCreateTask}
            onCancel={() => setShowTaskForm(false)}
          />
        )}

        {selectedTask && (
          <TaskForm
            task={selectedTask}
            onSubmit={(taskData) => handleUpdateTask(selectedTask.id, taskData)}
            onCancel={() => setSelectedTask(null)}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;