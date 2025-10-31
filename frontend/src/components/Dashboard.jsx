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

  // Filter tasks and subtasks based on search query and user filter
  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Filter by user assignment
    if (selectedUserId) {
      filtered = filtered.filter(task => {
        const assignedUserIds = task.assignments?.map(a => a.user_id || a.id) || [];
        return assignedUserIds.includes(selectedUserId);
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
  }, [tasks, searchQuery, selectedUserId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.first_name}!
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your team's tasks and stay organized.
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full">
              <div className="relative flex-1 max-w-md w-full">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search tasks or subtasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </div>
              
              <div className="relative flex-shrink-0">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FunnelIcon className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="block w-full sm:w-48 pl-10 pr-8 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 text-sm appearance-none cursor-pointer"
                >
                  <option value="">All Users</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
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
          
          {(searchQuery || selectedUserId) && (
            <div className="flex items-center gap-2 flex-wrap">
              {searchQuery && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Search: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-2 hover:text-blue-600"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedUserId && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  User: {users.find(u => u.id === selectedUserId)?.first_name} {users.find(u => u.id === selectedUserId)?.last_name}
                  <button
                    onClick={() => setSelectedUserId('')}
                    className="ml-2 hover:text-purple-600"
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
              {(searchQuery || selectedUserId) && filteredTasks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">🔍</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No tasks found
                  </h3>
                  <p className="text-gray-500">
                    {searchQuery && selectedUserId 
                      ? `No tasks match your search and filter criteria.`
                      : searchQuery
                      ? `No tasks or subtasks match "${searchQuery}"`
                      : `No tasks assigned to selected user.`
                    }
                  </p>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-6xl mb-4">📋</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No tasks yet
                  </h3>
                  <p className="text-gray-500">
                    Create your first task to get started.
                  </p>
                </div>
              ) : (
                <>
                  {(searchQuery || selectedUserId) && (
                    <div className="text-sm text-gray-600 mb-2">
                      Showing {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}
                      {searchQuery && ` matching "${searchQuery}"`}
                      {selectedUserId && ` assigned to ${users.find(u => u.id === selectedUserId)?.first_name} ${users.find(u => u.id === selectedUserId)?.last_name}`}
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
