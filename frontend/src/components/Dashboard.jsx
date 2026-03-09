import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { taskService, userService } from '../services/taskService';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import UserList from './UserList';
import { MagnifyingGlassIcon, XMarkIcon, FunnelIcon } from '@heroicons/react/24/outline';

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
  const [selectedDate, setSelectedDate] = useState('');
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
      setTasks(tasks.map(task => task.id === taskId ? response.task : task));
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
      // Reload tasks to get updated subtasks
      loadData();
    } catch (error) {
      console.error('Error creating subtask:', error);
    }
  };

  const handleUpdateSubtask = async (subtaskId, subtaskData) => {
    try {
      await taskService.updateSubtask(subtaskId, subtaskData);
      // Reload tasks to get updated subtasks
      loadData();
    } catch (error) {
      console.error('Error updating subtask:', error);
    }
  };

  const handleDeleteSubtask = async (subtaskId) => {
    try {
      await taskService.deleteSubtask(subtaskId);
      // Reload tasks to get updated subtasks
      loadData();
    } catch (error) {
      console.error('Error deleting subtask:', error);
    }
  };

  const handleAssignTask = async (taskId, userIds) => {
    try {
      await taskService.assignTask(taskId, userIds);
      // Reload tasks to get updated assignments
      loadData();
    } catch (error) {
      console.error('Error assigning task:', error);
    }
  };

  const handleAssignSubtask = async (subtaskId, userIds) => {
    try {
      await taskService.assignSubtask(subtaskId, userIds);
      // Reload tasks to get updated assignments
      loadData();
    } catch (error) {
      console.error('Error assigning subtask:', error);
    }
  };

  // Filter tasks and subtasks based on search query, user, priority, and status filters
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Filter by user assignment
    if (selectedUserId) {
      filtered = filtered.filter(task => {
        const assignedUserIds = task.assignments?.map(a => a.user_id || a.id) || [];
        return assignedUserIds.includes(selectedUserId);
      });
    }

    // Filter by priority
    if (selectedPriority) {
      filtered = filtered.filter(task => task.priority === selectedPriority);
    }

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(task => task.status === selectedStatus);
    }

    // Filter by date (matches tasks with this exact due date)
    if (selectedDate) {
      const filterDate = new Date(selectedDate);
      filterDate.setHours(0, 0, 0, 0);

      filtered = filtered.filter(task => {
        if (!task.due_date) return false;
        const taskDate = new Date(task.due_date);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === filterDate.getTime();
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      
      filtered = filtered
        .map(task => {
          // Check if task matches
          const taskMatches = 
            task.title?.toLowerCase().includes(query) ||
            task.description?.toLowerCase().includes(query);
          
          // Filter subtasks that match
          const matchingSubtasks = task.subtasks?.filter(subtask =>
            subtask.title?.toLowerCase().includes(query) ||
            subtask.description?.toLowerCase().includes(query)
          ) || [];
          
          // Include task if it matches or has matching subtasks
          if (taskMatches || matchingSubtasks.length > 0) {
            return {
              ...task,
              // If task doesn't match but has matching subtasks, only show those subtasks
              subtasks: taskMatches ? task.subtasks : matchingSubtasks
            };
          }
          
          return null;
        })
        .filter(task => task !== null);
    }

    return filtered;
  }, [tasks, searchQuery, selectedUserId, selectedPriority, selectedStatus, selectedDate]);

  const GanttView = ({ tasks }) => {
    const ganttTasks = useMemo(
      () => tasks.filter((task) => task.due_date),
      [tasks]
    );

    if (ganttTasks.length === 0) {
      return (
        <div className="flex-1 flex items-center justify-center py-8 rounded-xl border divider-soft bg-surface">
          <div className="text-center px-4">
            <h3 className="text-base sm:text-lg font-semibold text-foreground">
              No tasks with a due date
            </h3>
            <p className="text-sm text-muted mt-1">
              Add due dates to tasks to see them in the Gantt view.
            </p>
          </div>
        </div>
      );
    }

    const timeline = useMemo(() => {
      const oneDay = 24 * 60 * 60 * 1000;

      // Anchor week on selected date if provided, otherwise on today
      const anchor = selectedDate ? new Date(selectedDate) : new Date();
      anchor.setHours(0, 0, 0, 0);

      // Compute week start (Monday) and end (Sunday)
      const dayOfWeek = anchor.getDay(); // 0 = Sunday, 1 = Monday, ...
      const diffToMonday = (dayOfWeek + 6) % 7; // 0 for Monday
      const weekStart = new Date(anchor.getTime() - diffToMonday * oneDay);
      const weekEnd = new Date(weekStart.getTime() + 6 * oneDay);

      const parsedDates = ganttTasks
        .map((task) => ({
          task,
          date: new Date(task.due_date),
        }))
        .filter(({ date }) => {
          const d = new Date(date);
          d.setHours(0, 0, 0, 0);
          return d >= weekStart && d <= weekEnd;
        });

      const totalDays = 6; // fixed 7-day window

      const days = [];
      for (let i = 0; i <= totalDays; i++) {
        const d = new Date(weekStart.getTime() + i * oneDay);
        days.push(d);
      }

      return { oneDay, minDate: weekStart, maxDate: weekEnd, totalDays, days, parsedDates, weekStart, weekEnd };
    }, [ganttTasks, selectedDate]);

    const { oneDay, minDate, totalDays, days, parsedDates, weekStart, weekEnd } = timeline;

    const dayWidthPct = 100 / Math.max(1, totalDays + 1);

    return (
      <div className="flex-1 min-h-0 flex flex-col rounded-xl border divider-soft bg-surface/60 overflow-hidden">
        {/* Timeline header */}
        <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b divider-soft flex items-center justify-between">
          <span className="text-xs sm:text-sm font-semibold text-foreground">
            Gantt View
          </span>
          <span className="text-[10px] sm:text-xs text-muted">
            Week of{' '}
            {weekStart.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}{' '}
            -{' '}
            {weekEnd.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          <div className="min-w-[640px] px-3 sm:px-4 py-3 space-y-3">
            {/* Date scale */}
            <div className="pl-32 sm:pl-40">
              <div className="relative h-8 border-b border-border/60">
                {days.map((date, index) => {
                  const left = index * dayWidthPct;
                  const isToday =
                    new Date().toDateString() === date.toDateString();
                  return (
                    <div
                      key={date.toISOString()}
                      className="absolute top-0 h-full border-l border-border/40"
                      style={{ left: `${left}%`, width: `${dayWidthPct}%` }}
                    >
                      <div className="h-full flex flex-col items-center justify-end pb-0.5">
                        <span className="text-[9px] sm:text-[10px] text-muted">
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

            {/* Task rows */}
            <div className="space-y-2">
              {parsedDates.length === 0 && (
                <p className="text-xs sm:text-sm text-muted pl-32 sm:pl-40">
                  No tasks in this week. Adjust the date filter above or add due dates.
                </p>
              )}
              {parsedDates.map(({ task, date }) => {
                const offsetDays = Math.max(
                  0,
                  Math.round(
                    (date.getTime() - minDate.getTime()) / oneDay
                  )
                );
                const left = offsetDays * dayWidthPct;
                const width = Math.max(dayWidthPct * 0.7, 6);

                return (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 sm:gap-3"
                  >
                    <div className="w-32 sm:w-40 flex flex-col">
                      <span className="text-xs sm:text-sm font-medium text-foreground truncate">
                        {task.title}
                      </span>
                      <span className="text-[10px] text-muted">
                        {date.toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="relative h-6 rounded-full bg-slate-900/40 overflow-hidden">
                        <div
                          className={`absolute inset-y-0 rounded-full bg-primary-500/80`}
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                          }}
                        />
                      </div>
                    </div>
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-20 w-20 animate-spin rounded-full border-4 border-primary-500/30 border-t-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="relative z-10 flex flex-col h-full min-h-screen w-full overflow-hidden">
      <div className="flex flex-col flex-1 min-h-0 w-full max-w-[1920px] mx-auto px-3 py-4 sm:px-4 sm:py-5 lg:px-6">
        {/* Compact header: welcome + filters — always visible, no scroll */}
        <header className="flex-shrink-0 mb-3 sm:mb-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-foreground truncate">
                Welcome back, {user?.first_name}!
              </h1>
              <p className="text-xs sm:text-sm text-muted mt-0.5">
                Manage your team&apos;s tasks and stay organized.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="relative flex-1 min-w-0 max-w-full sm:max-w-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-4">
                  <MagnifyingGlassIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary-500/70" />
                </div>
                <input
                  type="text"
                  placeholder="Search tasks or subtasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field !pl-9 !pr-10 sm:!pl-11 sm:!pr-12 !py-2.5 sm:!py-3 text-sm w-full"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 sm:pr-4 text-muted transition hover:text-foreground"
                  >
                    <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2 items-stretch">
                <div className="relative flex-shrink-0 min-w-0">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 sm:pl-3">
                    <FunnelIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary-500/70" />
                  </div>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="input-field w-full min-w-[120px] sm:w-36 lg:w-40 appearance-none !pl-9 !pr-9 sm:!pl-11 sm:!pr-10 text-xs sm:text-sm cursor-pointer !py-2.5"
                  >
                    <option value="">All users</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-3 text-muted">
                    <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <select
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  className="input-field w-28 sm:w-32 appearance-none !pr-9 text-xs sm:text-sm cursor-pointer !py-2.5"
                >
                  <option value="">Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="input-field w-32 sm:w-36 appearance-none text-xs sm:text-sm cursor-pointer !py-2.5"
                />
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="input-field w-32 sm:w-36 lg:w-40 appearance-none !pr-9 text-xs sm:text-sm cursor-pointer !py-2.5"
                >
                  <option value="">Status</option>
                  <option value="todo">To do</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>
                <button
                  type="button"
                  onClick={() => setShowGanttView((prev) => !prev)}
                  className={`inline-flex items-center justify-center rounded-xl border px-3 sm:px-4 text-xs sm:text-sm font-medium transition whitespace-nowrap ${
                    showGanttView
                      ? 'bg-primary-600/90 text-white border-primary-500 shadow-sm'
                      : 'bg-surface text-muted hover:text-foreground border-border hover:bg-surface/80'
                  }`}
                >
                  {showGanttView ? 'Board View' : 'Gantt View'}
                </button>
                <button
                  onClick={() => setShowTaskForm(true)}
                  className="btn-primary whitespace-nowrap shrink-0 !py-2.5"
                >
                  Create New Task
                </button>
              </div>
            </div>

            {(searchQuery || selectedUserId || selectedPriority || selectedStatus || selectedDate) && (
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
                {selectedDate && (
                  <span className="chip text-xs">
                    Date: {selectedDate}
                    <button type="button" onClick={() => setSelectedDate('')} className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-[inherit] opacity-80 transition hover:opacity-100">
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Main content: board / gantt + sidebar — fills remaining height, scrolls inside columns */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 sm:gap-4 overflow-hidden">
          <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
            {!showGanttView && (searchQuery || selectedUserId || selectedPriority || selectedStatus) && filteredTasks.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-8 rounded-xl border divider-soft bg-surface">
                <div className="text-center px-4">
                  <div className="mb-3 text-4xl sm:text-5xl text-primary-500/60">🔍</div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">No tasks found</h3>
                  <p className="text-sm text-muted mt-1">Try adjusting your filters.</p>
                </div>
              </div>
            ) : !showGanttView && filteredTasks.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-8 rounded-xl border divider-soft bg-surface">
                <div className="text-center px-4">
                  <div className="mb-3 text-4xl sm:text-5xl text-primary-500/60">📋</div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">No tasks yet</h3>
                  <p className="text-sm text-muted mt-1">Create your first task to get started.</p>
                </div>
              </div>
            ) : showGanttView ? (
              <GanttView tasks={filteredTasks} />
            ) : (
              <>
                {(searchQuery || selectedUserId || selectedPriority || selectedStatus) && (
                  <p className="text-xs sm:text-sm text-muted px-0.5 mb-1 shrink-0">
                    Showing {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
                  </p>
                )}
                <div className="flex-1 min-h-0 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 overflow-hidden">
                  {['todo', 'in_progress', 'completed'].map((status) => {
                    const columnTasks = filteredTasks.filter((t) => t.status === status);
                    const columnLabels = { todo: 'To Do', in_progress: 'In Progress', completed: 'Completed' };
                    return (
                      <div
                        key={status}
                        className="flex flex-col rounded-xl border divider-soft bg-surface/50 overflow-hidden min-h-0 min-w-0"
                      >
                        <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b divider-soft flex items-center justify-between shrink-0">
                          <span className="font-semibold text-foreground text-xs sm:text-sm truncate">
                            {columnLabels[status]}
                          </span>
                          <span className="text-[10px] sm:text-xs font-medium text-muted bg-muted/50 px-2 py-0.5 rounded-full shrink-0">
                            {columnTasks.length}
                          </span>
                        </div>
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-3 space-y-2 sm:space-y-3">
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

          <aside className="flex-shrink-0 w-full lg:w-72 xl:w-80 flex flex-col min-h-0 lg:min-h-[320px]">
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
