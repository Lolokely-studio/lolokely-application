import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { companyService } from '../services/crmService';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const CompanyForm = ({ company, onSubmit, onCancel, error }) => {
  const [formData, setFormData] = useState({
    company_name: company?.company_name || '',
    domain: company?.domain || '',
    country: company?.country || '',
    city: company?.city || '',
    region: company?.region || '',
    website: company?.website || '',
    founded_year: company?.founded_year ?? '',
    company_type: company?.company_type || '',
    status: company?.status || '',
    notes: company?.notes || '',
  });

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      founded_year: formData.founded_year ? parseInt(formData.founded_year, 10) : null,
      country: formData.country || null,
      city: formData.city || null,
      region: formData.region || null,
      website: formData.website || null,
      company_type: formData.company_type || null,
      status: formData.status || null,
      notes: formData.notes || null,
    };
    onSubmit(payload);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="glass-panel mx-4 w-full max-w-lg max-h-[90vh] overflow-y-auto px-6 py-6 sm:px-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {company ? 'Edit Company' : 'New Company'}
          </h2>
          <button
            onClick={onCancel}
            className="text-muted transition hover:text-foreground"
            aria-label="Close modal"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="company_name" className="mb-1 block text-sm font-medium text-muted">
                Company Name *
              </label>
              <input
                type="text"
                id="company_name"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="Acme Inc."
              />
            </div>

            <div>
              <label htmlFor="domain" className="mb-1 block text-sm font-medium text-muted">
                Domain *
              </label>
              <input
                type="text"
                id="domain"
                name="domain"
                value={formData.domain}
                onChange={handleChange}
                required
                className="input-field"
                placeholder="acme.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="country" className="mb-1 block text-sm font-medium text-muted">
                Country
              </label>
              <input
                type="text"
                id="country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="input-field"
                placeholder="France"
              />
            </div>

            <div>
              <label htmlFor="city" className="mb-1 block text-sm font-medium text-muted">
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="input-field"
                placeholder="Paris"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="region" className="mb-1 block text-sm font-medium text-muted">
                Region
              </label>
              <input
                type="text"
                id="region"
                name="region"
                value={formData.region}
                onChange={handleChange}
                className="input-field"
                placeholder="Île-de-France"
              />
            </div>

            <div>
              <label htmlFor="website" className="mb-1 block text-sm font-medium text-muted">
                Website
              </label>
              <input
                type="text"
                id="website"
                name="website"
                value={formData.website}
                onChange={handleChange}
                className="input-field"
                placeholder="https://acme.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="founded_year" className="mb-1 block text-sm font-medium text-muted">
                Founded Year
              </label>
              <input
                type="number"
                id="founded_year"
                name="founded_year"
                value={formData.founded_year}
                onChange={handleChange}
                className="input-field"
                placeholder="2010"
              />
            </div>

            <div>
              <label htmlFor="company_type" className="mb-1 block text-sm font-medium text-muted">
                Company Type
              </label>
              <input
                type="text"
                id="company_type"
                name="company_type"
                value={formData.company_type}
                onChange={handleChange}
                className="input-field"
                placeholder="startup"
              />
            </div>

            <div>
              <label htmlFor="status" className="mb-1 block text-sm font-medium text-muted">
                Status
              </label>
              <input
                type="text"
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input-field"
                placeholder="active"
              />
            </div>
          </div>

          <div>
            <label htmlFor="notes" className="mb-1 block text-sm font-medium text-muted">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              className="input-field"
              placeholder="Internal notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {company ? 'Save Changes' : 'Create Company'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CrmCompanies = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('');
  const [country, setCountry] = useState('');
  const [companyType, setCompanyType] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formError, setFormError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const perPage = 10;

  const reloadCompanies = () => setReloadKey((k) => k + 1);

  // Debounce search text before hitting the API
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        const response = await companyService.getCompanies({
          q: debouncedSearch || undefined,
          status: status || undefined,
          country: country || undefined,
          company_type: companyType || undefined,
          page: currentPage,
          per_page: perPage,
        });
        if (cancelled) return;
        setCompanies(response.companies || []);
        setTotal(response.total || 0);
      } catch (error) {
        if (!cancelled) console.error('Error loading companies:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, status, country, companyType, currentPage, reloadKey]);

  // Reset to page 1 when filters change (cancels in-flight wrong-page fetch via cleanup above)
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, status, country, companyType]);

  const setFilterAndResetPage = (setter) => (value) => {
    setter(value);
    setCurrentPage(1);
  };

  const totalPages = Math.max(Math.ceil(total / perPage), 1);

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setStatus('');
    setCountry('');
    setCompanyType('');
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || status || country || companyType;

  const handleRowClick = (company) => {
    navigate(`/crm/${company.id}`);
  };

  const handleOpenCreate = () => {
    setEditingCompany(null);
    setFormError(null);
    setShowForm(true);
  };

  const handleOpenEdit = (e, company) => {
    e.stopPropagation();
    setEditingCompany(company);
    setFormError(null);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingCompany(null);
    setFormError(null);
  };

  const handleFormSubmit = async (payload) => {
    try {
      if (editingCompany) {
        await companyService.updateCompany(editingCompany.id, payload);
      } else {
        await companyService.createCompany(payload);
      }
      handleCloseForm();
      reloadCompanies();
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.response?.data?.details ||
        'Something went wrong while saving the company.';
      setFormError(typeof message === 'string' ? message : JSON.stringify(message));
    }
  };

  const handleDelete = async (e, company) => {
    e.stopPropagation();
    setDeleteError(null);
    if (!window.confirm(`Delete company "${company.company_name}"? This cannot be undone.`)) {
      return;
    }
    try {
      await companyService.deleteCompany(company.id);
      reloadCompanies();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to delete company.';
      setDeleteError(message);
    }
  };

  return (
    <div className="relative z-10 min-h-screen pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">CRM</h1>
            <p className="mt-2 text-muted">Manage companies and outreach data.</p>
          </div>
          <button type="button" onClick={handleOpenCreate} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <PlusIcon className="h-5 w-5" />
            New Company
          </button>
        </div>

        {deleteError && (
          <div className="mb-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600">
            {deleteError}
          </div>
        )}

        <div className="mb-6 space-y-4">
          <div className="relative w-full max-w-md">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <MagnifyingGlassIcon className="h-5 w-5 text-primary-500/70" />
            </div>
            <input
              type="text"
              placeholder="Search by name, domain, city, or country..."
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

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Status</label>
              <input
                type="text"
                value={status}
                onChange={(e) => setFilterAndResetPage(setStatus)(e.target.value)}
                placeholder="e.g. active"
                className="input-field !py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setFilterAndResetPage(setCountry)(e.target.value)}
                placeholder="e.g. France"
                className="input-field !py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Company Type</label>
              <input
                type="text"
                value={companyType}
                onChange={(e) => setFilterAndResetPage(setCompanyType)(e.target.value)}
                placeholder="e.g. startup"
                className="input-field !py-2 text-sm"
              />
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-xl border border-primary-500/25 bg-primary-500/10 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-primary-500/20"
              >
                <XMarkIcon className="h-4 w-4" />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary-500/30 border-t-primary-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {companies.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mb-4 text-6xl text-primary-500/60">
                  {hasActiveFilters ? '🔍' : '🏢'}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">
                  {hasActiveFilters ? 'No companies found' : 'No companies yet'}
                </h3>
                <p className="text-muted">
                  {hasActiveFilters
                    ? 'No companies match your search or filters.'
                    : 'Create your first company to get started.'}
                </p>
              </div>
            ) : (
              <>
                <div className="mb-2 text-sm text-muted">
                  Showing {((currentPage - 1) * perPage) + 1} to {Math.min(currentPage * perPage, total)} of {total} companies
                </div>

                <div className="glass-card overflow-hidden rounded-2xl border border-primary-500/10">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-primary-500/10 text-xs font-semibold uppercase tracking-wide text-muted">
                          <th className="px-4 py-3">Name</th>
                          <th className="px-4 py-3">Domain</th>
                          <th className="px-4 py-3">Location</th>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companies.map((company) => (
                          <tr
                            key={company.id}
                            onClick={() => handleRowClick(company)}
                            className="cursor-pointer border-b border-primary-500/5 transition hover:bg-primary-500/10"
                          >
                            <td className="px-4 py-3 font-medium text-foreground">
                              {company.company_name || 'Untitled'}
                            </td>
                            <td className="px-4 py-3 text-muted">{company.domain || 'N/A'}</td>
                            <td className="px-4 py-3 text-muted">
                              {[company.city, company.country].filter(Boolean).join(', ') || 'N/A'}
                            </td>
                            <td className="px-4 py-3 text-muted capitalize">{company.company_type || 'N/A'}</td>
                            <td className="px-4 py-3">
                              {company.status ? (
                                <span className="chip bg-primary-500/15 text-primary-600 border-primary-500/25 capitalize">
                                  {company.status}
                                </span>
                              ) : (
                                <span className="text-muted">N/A</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => handleOpenEdit(e, company)}
                                  className="rounded-lg p-2 text-muted transition hover:bg-primary-500/15 hover:text-foreground"
                                  title="Edit company"
                                >
                                  <PencilIcon className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDelete(e, company)}
                                  className="rounded-lg p-2 text-muted transition hover:bg-red-500/15 hover:text-red-600"
                                  title="Delete company"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        {total > perPage && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevious}
                disabled={currentPage === 1}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  currentPage > 1
                    ? 'border-primary-500/25 bg-primary-500/15 text-foreground hover:bg-primary-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400'
                    : 'border-primary-500/10 bg-primary-500/5 text-muted cursor-not-allowed opacity-50'
                }`}
              >
                <ChevronLeftIcon className="h-4 w-4" />
                Previous
              </button>

              <button
                onClick={handleNext}
                disabled={currentPage === totalPages}
                className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                  currentPage < totalPages
                    ? 'border-primary-500/25 bg-primary-500/15 text-foreground hover:bg-primary-500/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400'
                    : 'border-primary-500/10 bg-primary-500/5 text-muted cursor-not-allowed opacity-50'
                }`}
              >
                Next
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <CompanyForm
          company={editingCompany}
          onSubmit={handleFormSubmit}
          onCancel={handleCloseForm}
          error={formError}
        />
      )}
    </div>
  );
};

export default CrmCompanies;
