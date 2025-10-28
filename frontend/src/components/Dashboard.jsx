import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { taskService, userService } from '../services/taskService';
import TaskCard from './TaskCard';
import TaskForm from './TaskForm';
import UserList from './UserList';

const Dashboard = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

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

        <div className="mb-6">
          <button
            onClick={() => setShowTaskForm(true)}
            className="btn-primary"
          >
            Create New Task
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {tasks.length === 0 ? (
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
                tasks.map((task) => (
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
                ))
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
