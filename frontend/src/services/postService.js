import api from './api';

export const postService = {
  async generatePosts(postData) {
    const response = await api.post('/posts/generate', postData);
    return response.data;
  },

  async savePost(postData) {
    const response = await api.post('/posts/save', postData);
    return response.data;
  },

  async getPosts() {
    const response = await api.get('/posts/');
    return response.data;
  },

  async getPreferences() {
    const response = await api.get('/posts/preferences');
    return response.data;
  },
};

