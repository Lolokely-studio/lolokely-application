import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  TableCellsIcon,
  ViewColumnsIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { Skeleton } from './Skeleton';
import StatusSelect from './crm/StatusSelect';
import StatusFilterChips from './crm/StatusFilterChips';
import CompanyAvatar from './crm/CompanyAvatar';
import KanbanBoard from './crm/KanbanBoard';
import { CRM_VIEW_MODE_KEY } from './crm/crmConstants';

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
    status: company?.status || 'new',
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
    onSubmit({
      ...formData,
      founded_year: formData.founded_year ? parseInt(formData.founded_year, 10) : null,
      country: formData.country || null,
      city: formData.city || null,
      region: formData.region || null,
      website: formData.website || null,
      company_type: formData.company_type || null,
      status: formData.status || 'new',
      notes: formData.notes || null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        className="glass-panel mx-4 w-full max-w-lg max-h-[90vh] overflow-y-auto px-6 py-6 sm:px-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {company ? 'Edit Company' : 'New Company'}
          </h2>
          <button onClick={onCancel} className="text-muted transition hover:text-foreground" aria-label="Close">
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
              <label className="mb-1 block text-sm font-medium text-muted">Company Name *</label>
              <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} required className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted">Domain *</label>
              <input type="text" name="domain" value={formData.domain} onChange={handleChange} required className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted">Country</label>
              <input type="text" name="country" value={formData.country} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted">City</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted">Region</label>
              <input type="text" name="region" value={formData.region} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted">Website</label>
              <input type="text" name="website" value={formData.website} onChange={handleChange} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-muted">Founded Year</label>
              <input type="number" name="founded_year" value={formData.founded_year} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted">Company Type</label>
              <input type="text" name="company_type" value={formData.company_type} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-muted">Status</label>
              <StatusSelect value={formData.status} onChange={(v) => setFormData((p) => ({ ...p, status: v }))} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-muted">Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="input-field" />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{company ? 'Save Changes' : 'Create Company'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const SortHeader = ({ label, column, sort, order, onSort }) => {
  const active = sort === column;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="inline-flex items-center gap-1 hover:text-foreground"
    >
      {label}
      {active && (order === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />)}
    </button>
  );
};

const getPageNumbers = (current, total) => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  return [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
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
  const [sort, setSort] = useState('updated_at');
  const [order, setOrder] = useState('desc');
  const [showForm, setShowForm] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [formError, setFormError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [statusCounts, setStatusCounts] = useState({ counts: {}, total: 0 });
  const [viewMode, setViewMode] = useState(() => localStorage.getItem(CRM_VIEW_MODE_KEY) || 'list');
  const perPage = 25;

  const listFilters = useMemo(
    () => ({
      q: debouncedSearch || undefined,
      country: country || undefined,
      company_type: companyType || undefined,
    }),
    [debouncedSearch, country, companyType]
  );

  const reloadCompanies = () => setReloadKey((k) => k + 1);

  const loadStatusCounts = useCallback(async () => {
    try {
      const data = await companyService.getStatusCounts(listFilters);
      setStatusCounts(data);
    } catch (err) {
      console.error('Error loading status counts:', err);
    }
  }, [listFilters]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    loadStatusCounts();
  }, [loadStatusCounts, reloadKey]);

  useEffect(() => {
    if (viewMode !== 'list') return undefined;
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        const response = await companyService.getCompanies({
          ...listFilters,
          status: status || undefined,
          page: currentPage,
          per_page: perPage,
          sort,
          order,
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
    return () => { cancelled = true; };
  }, [listFilters, status, currentPage, sort, order, reloadKey, viewMode]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, status, country, companyType]);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem(CRM_VIEW_MODE_KEY, mode);
  };

  const handleSort = (column) => {
    if (sort === column) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(column);
      setOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleStatusChange = async (company, newStatus) => {
    const prev = company.status;
    setStatusError(null);
    setCompanies((rows) =>
      rows.map((c) => (c.id === company.id ? { ...c, status: newStatus } : c))
    );
    try {
      await companyService.updateCompanyStatus(company.id, newStatus);
      loadStatusCounts();
    } catch (err) {
      setCompanies((rows) =>
        rows.map((c) => (c.id === company.id ? { ...c, status: prev } : c))
      );
      setStatusError(err.response?.data?.error || 'Failed to update status.');
      throw err;
    }
  };

  const totalPages = Math.max(Math.ceil(total / perPage), 1);
  const hasActiveFilters = searchQuery || status || country || companyType;

  const clearFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setStatus('');
    setCountry('');
    setCompanyType('');
    setCurrentPage(1);
  };

  return (
    <div className="relative z-10 min-h-screen pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">CRM</h1>
            <p className="mt-2 text-muted">Pipeline de prospection</p>
          </div>
          <button type="button" onClick={() => { setEditingCompany(null); setFormError(null); setShowForm(true); }} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            <PlusIcon className="h-5 w-5" />
            New Company
          </button>
        </div>

        {(deleteError || statusError) && (
          <div className="mb-6 space-y-2">
            {deleteError && <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600">{deleteError}</div>}
            {statusError && <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600">{statusError}</div>}
          </div>
        )}

        <div className="mb-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                <button type="button" onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted hover:text-foreground">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="flex rounded-xl border border-primary-500/25 p-1">
              <button
                type="button"
                onClick={() => handleViewModeChange('list')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${viewMode === 'list' ? 'bg-primary-600/90 text-white' : 'text-muted hover:text-foreground'}`}
              >
                <TableCellsIcon className="h-4 w-4" />
                Liste
              </button>
              <button
                type="button"
                onClick={() => handleViewModeChange('kanban')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${viewMode === 'kanban' ? 'bg-primary-600/90 text-white' : 'text-muted hover:text-foreground'}`}
              >
                <ViewColumnsIcon className="h-4 w-4" />
                Kanban
              </button>
            </div>
          </div>

          <StatusFilterChips
            activeStatus={status}
            counts={statusCounts.counts}
            total={statusCounts.total}
            onChange={setStatus}
          />

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Status</label>
              <StatusSelect allowEmpty value={status} onChange={setStatus} size="sm" className="!py-2" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Country</label>
              <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. France" className="input-field !py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">Company Type</label>
              <input type="text" value={companyType} onChange={(e) => setCompanyType(e.target.value)} placeholder="e.g. startup" className="input-field !py-2 text-sm" />
            </div>
            {hasActiveFilters && (
              <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 rounded-xl border border-primary-500/25 bg-primary-500/10 px-4 py-2 text-sm font-semibold text-foreground hover:bg-primary-500/20">
                <XMarkIcon className="h-4 w-4" />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {viewMode === 'kanban' ? (
          <KanbanBoard
            filters={listFilters}
            onStatusChange={handleStatusChange}
            onCountsChange={setStatusCounts}
          />
        ) : loading ? (
          <div role="status" className="glass-card overflow-hidden rounded-2xl border border-primary-500/10">
            <span className="sr-only">Loading…</span>
            <div className="overflow-x-auto p-4 space-y-3">
              {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          </div>
        ) : companies.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-4 text-6xl text-primary-500/60">{hasActiveFilters ? '🔍' : '🏢'}</div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">{hasActiveFilters ? 'No companies found' : 'No companies yet'}</h3>
            <p className="text-muted">{hasActiveFilters ? 'No companies match your search or filters.' : 'Create your first company to get started.'}</p>
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
                      <th className="px-4 py-3"><SortHeader label="Name" column="company_name" sort={sort} order={order} onSort={handleSort} /></th>
                      <th className="px-4 py-3">Domain</th>
                      <th className="px-4 py-3">Location</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3"><SortHeader label="Status" column="status" sort={sort} order={order} onSort={handleSort} /></th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
                      <tr key={company.id} onClick={() => navigate(`/crm/${company.id}`)} className="cursor-pointer border-b border-primary-500/5 transition hover:bg-primary-500/10">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3 font-medium text-foreground">
                            <CompanyAvatar name={company.company_name} />
                            {company.company_name || 'Untitled'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted">{company.domain || 'N/A'}</td>
                        <td className="px-4 py-3 text-muted">{[company.city, company.country].filter(Boolean).join(', ') || 'N/A'}</td>
                        <td className="px-4 py-3">
                          {company.company_type ? (
                            <span className="chip border border-primary-500/20 bg-primary-500/10 text-xs capitalize">{company.company_type}</span>
                          ) : <span className="text-muted">N/A</span>}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <StatusSelect
                            size="sm"
                            stopPropagation
                            value={company.status || 'new'}
                            onChange={(v) => handleStatusChange(company, v)}
                          />
                        </td>
                        <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={(e) => { e.stopPropagation(); setEditingCompany(company); setFormError(null); setShowForm(true); }} className="rounded-lg p-2 text-muted hover:bg-primary-500/15 hover:text-foreground" title="Edit">
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={async (e) => {
                              e.stopPropagation();
                              setDeleteError(null);
                              if (!window.confirm(`Delete company "${company.company_name}"?`)) return;
                              try {
                                await companyService.deleteCompany(company.id);
                                reloadCompanies();
                                loadStatusCounts();
                              } catch (err) {
                                setDeleteError(err.response?.data?.error || 'Failed to delete company.');
                              }
                            }} className="rounded-lg p-2 text-muted hover:bg-red-500/15 hover:text-red-600" title="Delete">
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

            {total > perPage && (
              <div className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
                <div className="text-sm text-muted">Page {currentPage} of {totalPages}</div>
                <div className="flex flex-wrap items-center gap-1">
                  <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="inline-flex items-center gap-1 rounded-xl border border-primary-500/25 px-3 py-2 text-sm font-semibold disabled:opacity-50">
                    <ChevronLeftIcon className="h-4 w-4" /> Prev
                  </button>
                  {getPageNumbers(currentPage, totalPages).map((page, i, arr) => (
                    <React.Fragment key={page}>
                      {i > 0 && arr[i - 1] !== page - 1 && <span className="px-1 text-muted">…</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`min-w-[2.25rem] rounded-xl border px-3 py-2 text-sm font-semibold ${page === currentPage ? 'border-primary-500 bg-primary-600/90 text-white' : 'border-primary-500/25 bg-primary-500/10 hover:bg-primary-500/20'}`}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  ))}
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="inline-flex items-center gap-1 rounded-xl border border-primary-500/25 px-3 py-2 text-sm font-semibold disabled:opacity-50">
                    Next <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showForm && (
        <CompanyForm
          company={editingCompany}
          onSubmit={async (payload) => {
            try {
              if (editingCompany) await companyService.updateCompany(editingCompany.id, payload);
              else await companyService.createCompany(payload);
              setShowForm(false);
              setEditingCompany(null);
              reloadCompanies();
              loadStatusCounts();
            } catch (err) {
              const message = err.response?.data?.error || err.response?.data?.details || 'Something went wrong.';
              setFormError(typeof message === 'string' ? message : JSON.stringify(message));
            }
          }}
          onCancel={() => { setShowForm(false); setEditingCompany(null); setFormError(null); }}
          error={formError}
        />
      )}
    </div>
  );
};

export default CrmCompanies;
