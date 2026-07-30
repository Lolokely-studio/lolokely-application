import api from './api';

export const companyService = {
  async getCompanies(params = {}) {
    const response = await api.get('/companies/', { params });
    return response.data;
  },
  async getCompany(id) {
    const response = await api.get(`/companies/${id}`);
    return response.data;
  },
  async createCompany(data) {
    const response = await api.post('/companies/', data);
    return response.data;
  },
  async updateCompany(id, data) {
    const response = await api.put(`/companies/${id}`, data);
    return response.data;
  },
  async deleteCompany(id) {
    const response = await api.delete(`/companies/${id}`);
    return response.data;
  },
  async getStatusCounts(params = {}) {
    const response = await api.get('/companies/status-counts', { params });
    return response.data;
  },
  async updateCompanyStatus(id, status) {
    const response = await api.patch(`/companies/${id}/status`, { status });
    return response.data;
  },
};

export const prospectService = {
  async getProspects(params = {}) {
    const response = await api.get('/prospects/', { params });
    return response.data;
  },
  async createProspect(data) {
    const response = await api.post('/prospects/', data);
    return response.data;
  },
  async updateProspect(id, data) {
    const response = await api.put(`/prospects/${id}`, data);
    return response.data;
  },
  async deleteProspect(id) {
    const response = await api.delete(`/prospects/${id}`);
    return response.data;
  },
};

export const companyEmailService = {
  async getEmails(params = {}) {
    const response = await api.get('/company-emails/', { params });
    return response.data;
  },
  async createEmail(data) {
    const response = await api.post('/company-emails/', data);
    return response.data;
  },
  async updateEmail(id, data) {
    const response = await api.put(`/company-emails/${id}`, data);
    return response.data;
  },
  async deleteEmail(id) {
    const response = await api.delete(`/company-emails/${id}`);
    return response.data;
  },
};

export const companyFinancialService = {
  async getFinancials(params = {}) {
    const response = await api.get('/company-financials/', { params });
    return response.data;
  },
  async createFinancial(data) {
    const response = await api.post('/company-financials/', data);
    return response.data;
  },
  async updateFinancial(id, data) {
    const response = await api.put(`/company-financials/${id}`, data);
    return response.data;
  },
  async deleteFinancial(id) {
    const response = await api.delete(`/company-financials/${id}`);
    return response.data;
  },
};
