import api from './api';

export const crmAiService = {
  async suggestTop() {
    const response = await api.post('/crm-ai/suggest-top');
    return response.data;
  },
  async getLatestSuggestTop() {
    const response = await api.get('/crm-ai/suggest-top/latest');
    return response.data;
  },
  async generateOutreachPack(companyId) {
    const response = await api.post(`/crm-ai/companies/${companyId}/outreach-pack`);
    return response.data;
  },
  async getOutreachPack(companyId) {
    const response = await api.get(`/crm-ai/companies/${companyId}/outreach-pack`);
    return response.data;
  },
  async listRuns(params = {}) {
    const response = await api.get('/crm-ai/runs', { params });
    return response.data;
  },
};
