import api from './api';

export const authService = {
  async register(userData) {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  async login(credentials) {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  async getCurrentUser() {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

export const taskService = {
  async getTasks() {
    const response = await api.get('/tasks/');
    return response.data;
  },

  async createTask(taskData) {
    const response = await api.post('/tasks/', taskData);
    return response.data;
  },

  async getTask(taskId) {
    const response = await api.get(`/tasks/${taskId}`);
    return response.data;
  },

  async updateTask(taskId, taskData) {
    const response = await api.put(`/tasks/${taskId}`, taskData);
    return response.data;
  },

  async deleteTask(taskId) {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
  },

  async assignTask(taskId, userIds) {
    const response = await api.post(`/tasks/${taskId}/assign`, { user_ids: userIds });
    return response.data;
  },

  async createSubtask(taskId, subtaskData) {
    const response = await api.post(`/tasks/${taskId}/subtasks`, subtaskData);
    return response.data;
  },

  async updateSubtask(subtaskId, subtaskData) {
    const response = await api.put(`/tasks/subtasks/${subtaskId}`, subtaskData);
    return response.data;
  },

  async deleteSubtask(subtaskId) {
    const response = await api.delete(`/tasks/subtasks/${subtaskId}`);
    return response.data;
  },

  async assignSubtask(subtaskId, userIds) {
    const response = await api.post(`/tasks/subtasks/${subtaskId}/assign`, { user_ids: userIds });
    return response.data;
  },
};

export const userService = {
  async getUsers() {
    const response = await api.get('/users/');
    return response.data;
  },

  async getUser(userId) {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },
};

export const jobService = {
  async getJobs() {
    const response = await api.get('/jobs/');
    return response.data;
  },

  async getJob(jobId) {
    const response = await api.get(`/jobs/${jobId}`);
    return response.data;
  },
};

export const leaveService = {
  async createLeaveRequest(leaveData) {
    const response = await api.post('/leaves/', leaveData);
    return response.data;
  },

  async getLeaveRequests() {
    const response = await api.get('/leaves/');
    return response.data;
  },

  async getMyLeaveRequests() {
    const response = await api.get('/leaves/my-requests');
    return response.data;
  },

  async getPendingLeaveRequests() {
    const response = await api.get('/leaves/pending');
    return response.data;
  },

  async approveLeaveRequest(leaveId, approvalData) {
    const response = await api.put(`/leaves/${leaveId}/approve`, approvalData);
    return response.data;
  },

  async getLeaveHistory() {
    const response = await api.get('/leaves/history');
    return response.data;
  },
};
