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
      const response = await taskService.createSubtask(taskId, subtaskData);
      // Reload tasks to get updated subtasks
      loadData();
    } catch (error) {
      console.error('Error creating subtask:', error);
    }
  };

  const handleUpdateSubtask = async (subtaskId, subtaskData) => {
    try {
      const response = await taskService.updateSubtask(subtaskId, subtaskData);
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
  }, [tasks, searchQuery, selectedUserId, selectedPriority, selectedStatus]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-20 w-20 animate-spin rounded-full border-4 border-primary-500/30 border-t-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground">
            Welcome back, {user?.first_name}!
          </h1>
          <p className="mt-2 text-muted">
            Manage your team's tasks and stay organized.
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
              <div className="relative w-full flex-1 max-w-md">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <MagnifyingGlassIcon className="h-5 w-5 text-primary-500/70" />
                </div>
                <input
                  type="text"
                  placeholder="Search tasks or subtasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field !pl-11 !pr-12 !py-3 text-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted transition hover:text-foreground"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-3 flex-1">
                <div className="relative flex-shrink-0">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <FunnelIcon className="h-5 w-5 text-primary-500/70" />
                  </div>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="input-field sm:w-40 appearance-none !pl-11 !pr-12 text-sm cursor-pointer"
                  >
                    <option value="">All users</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.first_name} {user.last_name}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <div className="relative flex-shrink-0">
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="input-field sm:w-32 appearance-none !pr-12 text-sm cursor-pointer"
                  >
                    <option value="">All priorities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <div className="relative flex-shrink-0">
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="input-field sm:w-40 appearance-none !pr-12 text-sm cursor-pointer"
                  >
                    <option value="">All status</option>
                    <option value="todo">To do</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-muted">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setShowTaskForm(true)}
              className="btn-primary whitespace-nowrap"
            >
              Create New Task
            </button>
          </div>
          
          {(searchQuery || selectedUserId || selectedPriority || selectedStatus) && (
            <div className="flex flex-wrap items-center gap-2">
              {searchQuery && (
                <span className="chip">
                  Search: "{searchQuery}"
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-[inherit] opacity-80 transition hover:opacity-100"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedUserId && (
                <span className="chip">
                  User: {users.find(u => u.id === selectedUserId)?.first_name} {users.find(u => u.id === selectedUserId)?.last_name}
                  <button
                    type="button"
                    onClick={() => setSelectedUserId('')}
                    className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-[inherit] opacity-80 transition hover:opacity-100"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedPriority && (
                <span className="chip">
                  Priority: {selectedPriority.charAt(0).toUpperCase() + selectedPriority.slice(1)}
                  <button
                    type="button"
                    onClick={() => setSelectedPriority('')}
                    className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-[inherit] opacity-80 transition hover:opacity-100"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedStatus && (
                <span className="chip">
                  Status: {selectedStatus === 'in_progress' ? 'In progress' : selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)}
                  <button
                    type="button"
                    onClick={() => setSelectedStatus('')}
                    className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-[inherit] opacity-80 transition hover:opacity-100"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {(searchQuery || selectedUserId || selectedPriority || selectedStatus) && filteredTasks.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mb-4 text-6xl text-primary-500/60">🔍</div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    No tasks found
                  </h3>
                  <p className="text-muted">
                    No tasks match your current filters. Try adjusting them for more results.
                  </p>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mb-4 text-6xl text-primary-500/60">📋</div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">
                    No tasks yet
                  </h3>
                  <p className="text-muted">
                    Create your first task to get started.
                  </p>
                </div>
              ) : (
                <>
                  {(searchQuery || selectedUserId || selectedPriority || selectedStatus) && (
                    <div className="mb-2 text-sm text-muted">
                      Showing {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
                      {searchQuery && ` matching "${searchQuery}"`}
                      {selectedUserId && ` assigned to ${users.find(u => u.id === selectedUserId)?.first_name} ${users.find(u => u.id === selectedUserId)?.last_name}`}
                      {selectedPriority && ` with ${selectedPriority} priority`}
                      {selectedStatus && ` with ${selectedStatus === 'in_progress' ? 'in progress' : selectedStatus} status`}
                    </div>
                  )}
                  {filteredTasks.map((task) => (
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
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <UserList users={users} />
          </div>
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
