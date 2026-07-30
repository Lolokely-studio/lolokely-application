import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  companyService,
  prospectService,
  companyEmailService,
  companyFinancialService,
} from '../services/crmService';
import {
  XMarkIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { Skeleton, SkeletonText } from './Skeleton';
import StatusSelect from './crm/StatusSelect';
import StatusBadge from './crm/StatusBadge';
import CompanyAvatar from './crm/CompanyAvatar';
import PipelineStepper from './crm/PipelineStepper';

const toDateInput = (value) => (value ? value.slice(0, 10) : '');
const toDateTimeInput = (value) => (value ? value.slice(0, 16) : '');
const emptyToNull = (value) => (value === '' || value === undefined ? null : value);

const ModalShell = ({ title, onCancel, error, children }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onCancel();
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
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
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

        {children}
      </div>
    </div>
  );
};

const Field = ({ label, children }) => (
  <div>
    <label className="mb-1 block text-sm font-medium text-muted">{label}</label>
    {children}
  </div>
);

/* ---------------------------- Company edit form --------------------------- */

const CompanyEditForm = ({ company, onSubmit, onCancel, error }) => {
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      founded_year: formData.founded_year ? parseInt(formData.founded_year, 10) : null,
      country: emptyToNull(formData.country),
      city: emptyToNull(formData.city),
      region: emptyToNull(formData.region),
      website: emptyToNull(formData.website),
      company_type: emptyToNull(formData.company_type),
      status: emptyToNull(formData.status),
      notes: emptyToNull(formData.notes),
    });
  };

  return (
    <ModalShell title="Edit Company" onCancel={onCancel} error={error}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Company Name *">
            <input
              type="text"
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              required
              className="input-field"
            />
          </Field>
          <Field label="Domain *">
            <input
              type="text"
              name="domain"
              value={formData.domain}
              onChange={handleChange}
              required
              className="input-field"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Country">
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className="input-field"
            />
          </Field>
          <Field label="City">
            <input
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              className="input-field"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Region">
            <input
              type="text"
              name="region"
              value={formData.region}
              onChange={handleChange}
              className="input-field"
            />
          </Field>
          <Field label="Website">
            <input
              type="text"
              name="website"
              value={formData.website}
              onChange={handleChange}
              className="input-field"
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Founded Year">
            <input
              type="number"
              name="founded_year"
              value={formData.founded_year}
              onChange={handleChange}
              className="input-field"
            />
          </Field>
          <Field label="Company Type">
            <input
              type="text"
              name="company_type"
              value={formData.company_type}
              onChange={handleChange}
              className="input-field"
            />
          </Field>
          <Field label="Status">
            <StatusSelect
              value={formData.status}
              onChange={(v) => setFormData((prev) => ({ ...prev, status: v }))}
            />
          </Field>
        </div>

        <Field label="Notes">
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="input-field"
          />
        </Field>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            Save Changes
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

/* -------------------------------- Prospects -------------------------------- */

const PROSPECT_STATUSES = ['new', 'contacted', 'negotiating', 'won', 'lost'];

const ProspectForm = ({ prospect, onSubmit, onCancel, error }) => {
  const [formData, setFormData] = useState({
    sent_by: prospect?.sent_by || '',
    status: prospect?.status || '',
    sent_at: toDateTimeInput(prospect?.sent_at),
    contract_status: prospect?.contract_status || '',
    contract_value: prospect?.contract_value ?? '',
    contract_currency: prospect?.contract_currency || '',
    contract_url: prospect?.contract_url || '',
    contract_signed_at: toDateInput(prospect?.contract_signed_at),
    notes: prospect?.notes || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      sent_by: emptyToNull(formData.sent_by),
      status: emptyToNull(formData.status),
      sent_at: emptyToNull(formData.sent_at),
      contract_status: emptyToNull(formData.contract_status),
      contract_value: emptyToNull(formData.contract_value),
      contract_currency: emptyToNull(formData.contract_currency),
      contract_url: emptyToNull(formData.contract_url),
      contract_signed_at: emptyToNull(formData.contract_signed_at),
      notes: emptyToNull(formData.notes),
    });
  };

  return (
    <ModalShell title={prospect ? 'Edit Prospect' : 'New Prospect'} onCancel={onCancel} error={error}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Sent By">
            <input type="text" name="sent_by" value={formData.sent_by} onChange={handleChange} className="input-field" />
          </Field>
          <Field label="Status">
            <select name="status" value={formData.status} onChange={handleChange} className="input-field">
              <option value="">—</option>
              {PROSPECT_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Sent At">
          <input type="datetime-local" name="sent_at" value={formData.sent_at} onChange={handleChange} className="input-field" />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Contract Status">
            <input type="text" name="contract_status" value={formData.contract_status} onChange={handleChange} className="input-field" />
          </Field>
          <Field label="Contract Signed At">
            <input type="date" name="contract_signed_at" value={formData.contract_signed_at} onChange={handleChange} className="input-field" />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Contract Value">
            <input type="number" step="0.01" name="contract_value" value={formData.contract_value} onChange={handleChange} className="input-field" />
          </Field>
          <Field label="Contract Currency">
            <input type="text" name="contract_currency" value={formData.contract_currency} onChange={handleChange} placeholder="EUR" className="input-field" />
          </Field>
        </div>

        <Field label="Contract URL">
          <input type="text" name="contract_url" value={formData.contract_url} onChange={handleChange} className="input-field" />
        </Field>

        <Field label="Notes">
          <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="input-field" />
        </Field>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary">{prospect ? 'Save Changes' : 'Add Prospect'}</button>
        </div>
      </form>
    </ModalShell>
  );
};

/* --------------------------------- Emails ---------------------------------- */

const EmailForm = ({ email, onSubmit, onCancel, error }) => {
  const [formData, setFormData] = useState({
    email: email?.email || '',
    email_type: email?.email_type || '',
    source_url: email?.source_url || '',
    scraped_at: toDateTimeInput(email?.scraped_at),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      email: formData.email,
      email_type: emptyToNull(formData.email_type),
      source_url: emptyToNull(formData.source_url),
      scraped_at: emptyToNull(formData.scraped_at),
    });
  };

  return (
    <ModalShell title={email ? 'Edit Email' : 'New Email'} onCancel={onCancel} error={error}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email *">
          <input type="email" name="email" value={formData.email} onChange={handleChange} required className="input-field" placeholder="contact@acme.com" />
        </Field>
        <Field label="Email Type">
          <input type="text" name="email_type" value={formData.email_type} onChange={handleChange} placeholder="general" className="input-field" />
        </Field>
        <Field label="Source URL">
          <input type="text" name="source_url" value={formData.source_url} onChange={handleChange} className="input-field" />
        </Field>
        <Field label="Scraped At">
          <input type="datetime-local" name="scraped_at" value={formData.scraped_at} onChange={handleChange} className="input-field" />
        </Field>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary">{email ? 'Save Changes' : 'Add Email'}</button>
        </div>
      </form>
    </ModalShell>
  );
};

/* ------------------------------- Financials -------------------------------- */

const FinancialForm = ({ financial, onSubmit, onCancel, error }) => {
  const [formData, setFormData] = useState({
    ticker: financial?.ticker || '',
    exchange: financial?.exchange || '',
    matched_name: financial?.matched_name || '',
    currency: financial?.currency || '',
    market_cap: financial?.market_cap ?? '',
    total_revenue: financial?.total_revenue ?? '',
    net_income: financial?.net_income ?? '',
    gross_profit: financial?.gross_profit ?? '',
    employees: financial?.employees ?? '',
    sector: financial?.sector || '',
    industry: financial?.industry || '',
    match_confidence: financial?.match_confidence || '',
    as_of: toDateInput(financial?.as_of),
    source: financial?.source || '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ticker: emptyToNull(formData.ticker),
      exchange: emptyToNull(formData.exchange),
      matched_name: emptyToNull(formData.matched_name),
      currency: emptyToNull(formData.currency),
      market_cap: emptyToNull(formData.market_cap),
      total_revenue: emptyToNull(formData.total_revenue),
      net_income: emptyToNull(formData.net_income),
      gross_profit: emptyToNull(formData.gross_profit),
      employees: formData.employees ? parseInt(formData.employees, 10) : null,
      sector: emptyToNull(formData.sector),
      industry: emptyToNull(formData.industry),
      match_confidence: emptyToNull(formData.match_confidence),
      as_of: emptyToNull(formData.as_of),
      source: emptyToNull(formData.source),
    });
  };

  return (
    <ModalShell title={financial ? 'Edit Financial Record' : 'New Financial Record'} onCancel={onCancel} error={error}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Ticker">
            <input type="text" name="ticker" value={formData.ticker} onChange={handleChange} className="input-field" />
          </Field>
          <Field label="Exchange">
            <input type="text" name="exchange" value={formData.exchange} onChange={handleChange} className="input-field" />
          </Field>
          <Field label="Currency">
            <input type="text" name="currency" value={formData.currency} onChange={handleChange} placeholder="EUR" className="input-field" />
          </Field>
        </div>

        <Field label="Matched Name">
          <input type="text" name="matched_name" value={formData.matched_name} onChange={handleChange} className="input-field" />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Market Cap">
            <input type="number" step="0.01" name="market_cap" value={formData.market_cap} onChange={handleChange} className="input-field" />
          </Field>
          <Field label="Total Revenue">
            <input type="number" step="0.01" name="total_revenue" value={formData.total_revenue} onChange={handleChange} className="input-field" />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Net Income">
            <input type="number" step="0.01" name="net_income" value={formData.net_income} onChange={handleChange} className="input-field" />
          </Field>
          <Field label="Gross Profit">
            <input type="number" step="0.01" name="gross_profit" value={formData.gross_profit} onChange={handleChange} className="input-field" />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Employees">
            <input type="number" name="employees" value={formData.employees} onChange={handleChange} className="input-field" />
          </Field>
          <Field label="As Of">
            <input type="date" name="as_of" value={formData.as_of} onChange={handleChange} className="input-field" />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Sector">
            <input type="text" name="sector" value={formData.sector} onChange={handleChange} className="input-field" />
          </Field>
          <Field label="Industry">
            <input type="text" name="industry" value={formData.industry} onChange={handleChange} className="input-field" />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Match Confidence">
            <input type="text" name="match_confidence" value={formData.match_confidence} onChange={handleChange} className="input-field" />
          </Field>
          <Field label="Source">
            <input type="text" name="source" value={formData.source} onChange={handleChange} className="input-field" />
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
          <button type="submit" className="btn-primary">{financial ? 'Save Changes' : 'Add Financial Record'}</button>
        </div>
      </form>
    </ModalShell>
  );
};

/* --------------------------- Generic child list tab ------------------------- */

const EmptyState = ({ label }) => (
  <div className="py-12 text-center">
    <div className="mb-4 text-5xl text-primary-500/60">📄</div>
    <h3 className="mb-2 text-lg font-semibold text-foreground">No {label} yet</h3>
    <p className="text-muted">Add the first record to get started.</p>
  </div>
);

const ChildTableShell = ({ children }) => (
  <div className="glass-card overflow-hidden rounded-2xl border border-primary-500/10">
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  </div>
);

const RowActions = ({ onEdit, onDelete }) => (
  <div className="flex justify-end gap-2">
    <button type="button" onClick={onEdit} className="rounded-lg p-2 text-muted transition hover:bg-primary-500/15 hover:text-foreground" title="Edit">
      <PencilIcon className="h-4 w-4" />
    </button>
    <button type="button" onClick={onDelete} className="rounded-lg p-2 text-muted transition hover:bg-red-500/15 hover:text-red-600" title="Delete">
      <TrashIcon className="h-4 w-4" />
    </button>
  </div>
);

const ProspectsTab = ({ companyId, onMutate }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState(null);
  const [listError, setListError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await prospectService.getProspects({ company_id: companyId });
      setItems(response.prospects || []);
    } catch (error) {
      console.error('Error loading prospects:', error);
      setListError('Failed to load prospects.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (payload) => {
    try {
      const body = { ...payload, company_id: companyId };
      if (editing) {
        await prospectService.updateProspect(editing.id, body);
      } else {
        await prospectService.createProspect(body);
      }
      setShowForm(false);
      setEditing(null);
      setFormError(null);
      load();
      onMutate?.();
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.details || 'Failed to save prospect.';
      setFormError(typeof message === 'string' ? message : JSON.stringify(message));
    }
  };

  const handleDelete = async (item) => {
    setListError(null);
    if (!window.confirm('Delete this prospect record? This cannot be undone.')) return;
    try {
      await prospectService.deleteProspect(item.id);
      load();
      onMutate?.();
    } catch (error) {
      setListError(error.response?.data?.error || 'Failed to delete prospect.');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Prospects</h3>
        <button
          type="button"
          onClick={() => { setEditing(null); setFormError(null); setShowForm(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Add Prospect
        </button>
      </div>

      {listError && (
        <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600">{listError}</div>
      )}

      {loading ? (
        <div role="status" className="space-y-3 py-2">
          <span className="sr-only">Loading…</span>
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-primary-500/10 px-4 py-3"
            >
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="ml-auto h-8 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState label="prospects" />
      ) : (
        <ChildTableShell>
          <thead>
            <tr className="border-b border-primary-500/10 text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Sent By</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Contract Status</th>
              <th className="px-4 py-3">Contract Value</th>
              <th className="px-4 py-3">Sent At</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-primary-500/5">
                <td className="px-4 py-3 font-medium text-foreground">{item.sent_by || 'N/A'}</td>
                <td className="px-4 py-3">
                  {item.status ? <span className="chip bg-primary-500/15 text-primary-600 border-primary-500/25 capitalize">{item.status}</span> : <span className="text-muted">N/A</span>}
                </td>
                <td className="px-4 py-3 text-muted capitalize">{item.contract_status || 'N/A'}</td>
                <td className="px-4 py-3 text-muted">{item.contract_value ? `${item.contract_value} ${item.contract_currency || ''}`.trim() : 'N/A'}</td>
                <td className="px-4 py-3 text-muted">{item.sent_at ? new Date(item.sent_at).toLocaleString() : 'N/A'}</td>
                <td className="px-4 py-3">
                  <RowActions
                    onEdit={() => { setEditing(item); setFormError(null); setShowForm(true); }}
                    onDelete={() => handleDelete(item)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </ChildTableShell>
      )}

      {showForm && (
        <ProspectForm
          prospect={editing}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditing(null); setFormError(null); }}
          error={formError}
        />
      )}
    </div>
  );
};

const EmailsTab = ({ companyId, onMutate }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState(null);
  const [listError, setListError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await companyEmailService.getEmails({ company_id: companyId });
      setItems(response.company_emails || []);
    } catch (error) {
      console.error('Error loading emails:', error);
      setListError('Failed to load emails.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (payload) => {
    try {
      const body = { ...payload, company_id: companyId };
      if (editing) {
        await companyEmailService.updateEmail(editing.id, body);
      } else {
        await companyEmailService.createEmail(body);
      }
      setShowForm(false);
      setEditing(null);
      setFormError(null);
      load();
      onMutate?.();
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.details || 'Failed to save email.';
      setFormError(typeof message === 'string' ? message : JSON.stringify(message));
    }
  };

  const handleDelete = async (item) => {
    setListError(null);
    if (!window.confirm(`Delete email "${item.email}"? This cannot be undone.`)) return;
    try {
      await companyEmailService.deleteEmail(item.id);
      load();
      onMutate?.();
    } catch (error) {
      setListError(error.response?.data?.error || 'Failed to delete email.');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Emails</h3>
        <button
          type="button"
          onClick={() => { setEditing(null); setFormError(null); setShowForm(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Add Email
        </button>
      </div>

      {listError && (
        <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600">{listError}</div>
      )}

      {loading ? (
        <div role="status" className="space-y-3 py-2">
          <span className="sr-only">Loading…</span>
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-primary-500/10 px-4 py-3"
            >
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="ml-auto h-8 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState label="emails" />
      ) : (
        <ChildTableShell>
          <thead>
            <tr className="border-b border-primary-500/10 text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Scraped At</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-primary-500/5">
                <td className="px-4 py-3 font-medium text-foreground">{item.email}</td>
                <td className="px-4 py-3 text-muted capitalize">{item.email_type || 'N/A'}</td>
                <td className="px-4 py-3 text-muted">
                  {item.source_url ? (
                    <a href={item.source_url} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">
                      link
                    </a>
                  ) : 'N/A'}
                </td>
                <td className="px-4 py-3 text-muted">{item.scraped_at ? new Date(item.scraped_at).toLocaleString() : 'N/A'}</td>
                <td className="px-4 py-3">
                  <RowActions
                    onEdit={() => { setEditing(item); setFormError(null); setShowForm(true); }}
                    onDelete={() => handleDelete(item)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </ChildTableShell>
      )}

      {showForm && (
        <EmailForm
          email={editing}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditing(null); setFormError(null); }}
          error={formError}
        />
      )}
    </div>
  );
};

const FinancialsTab = ({ companyId, onMutate }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formError, setFormError] = useState(null);
  const [listError, setListError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await companyFinancialService.getFinancials({ company_id: companyId });
      setItems(response.company_financials || []);
    } catch (error) {
      console.error('Error loading financials:', error);
      setListError('Failed to load financials.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (payload) => {
    try {
      const body = { ...payload, company_id: companyId };
      if (editing) {
        await companyFinancialService.updateFinancial(editing.id, body);
      } else {
        await companyFinancialService.createFinancial(body);
      }
      setShowForm(false);
      setEditing(null);
      setFormError(null);
      load();
      onMutate?.();
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.details || 'Failed to save financial record.';
      setFormError(typeof message === 'string' ? message : JSON.stringify(message));
    }
  };

  const handleDelete = async (item) => {
    setListError(null);
    if (!window.confirm('Delete this financial record? This cannot be undone.')) return;
    try {
      await companyFinancialService.deleteFinancial(item.id);
      load();
      onMutate?.();
    } catch (error) {
      setListError(error.response?.data?.error || 'Failed to delete financial record.');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Financials</h3>
        <button
          type="button"
          onClick={() => { setEditing(null); setFormError(null); setShowForm(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          Add Record
        </button>
      </div>

      {listError && (
        <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600">{listError}</div>
      )}

      {loading ? (
        <div role="status" className="space-y-3 py-2">
          <span className="sr-only">Loading…</span>
          {Array.from({ length: 5 }, (_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-xl border border-primary-500/10 px-4 py-3"
            >
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-4 w-1/6" />
              <Skeleton className="ml-auto h-8 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState label="financial records" />
      ) : (
        <ChildTableShell>
          <thead>
            <tr className="border-b border-primary-500/10 text-xs font-semibold uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Ticker</th>
              <th className="px-4 py-3">Market Cap</th>
              <th className="px-4 py-3">Revenue</th>
              <th className="px-4 py-3">Employees</th>
              <th className="px-4 py-3">As Of</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-primary-500/5">
                <td className="px-4 py-3 font-medium text-foreground">{item.ticker || 'N/A'}</td>
                <td className="px-4 py-3 text-muted">{item.market_cap ? `${item.market_cap} ${item.currency || ''}`.trim() : 'N/A'}</td>
                <td className="px-4 py-3 text-muted">{item.total_revenue ? `${item.total_revenue} ${item.currency || ''}`.trim() : 'N/A'}</td>
                <td className="px-4 py-3 text-muted">{item.employees ?? 'N/A'}</td>
                <td className="px-4 py-3 text-muted">{item.as_of || 'N/A'}</td>
                <td className="px-4 py-3">
                  <RowActions
                    onEdit={() => { setEditing(item); setFormError(null); setShowForm(true); }}
                    onDelete={() => handleDelete(item)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </ChildTableShell>
      )}

      {showForm && (
        <FinancialForm
          financial={editing}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditing(null); setFormError(null); }}
          error={formError}
        />
      )}
    </div>
  );
};

/* --------------------------------- Main page -------------------------------- */

const TABS = [
  { key: 'info', label: 'Info' },
  { key: 'prospects', label: 'Prospects' },
  { key: 'emails', label: 'Emails' },
  { key: 'financials', label: 'Financials' },
];

const CrmCompanyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const companyId = parseInt(id, 10);

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [activeTab, setActiveTab] = useState('info');
  const [showEditForm, setShowEditForm] = useState(false);
  const [editError, setEditError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [statusError, setStatusError] = useState(null);

  const loadCompany = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const response = await companyService.getCompany(companyId);
      setCompany(response.company);
    } catch (error) {
      console.error('Error loading company:', error);
      setLoadError(error.response?.data?.error || 'Failed to load company.');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  const handleEditSubmit = async (payload) => {
    try {
      await companyService.updateCompany(companyId, payload);
      setShowEditForm(false);
      setEditError(null);
      loadCompany();
    } catch (error) {
      const message = error.response?.data?.error || error.response?.data?.details || 'Failed to update company.';
      setEditError(typeof message === 'string' ? message : JSON.stringify(message));
    }
  };

  const handleStatusChange = async (newStatus) => {
    const prev = company.status;
    setStatusError(null);
    setCompany((c) => ({ ...c, status: newStatus }));
    try {
      const response = await companyService.updateCompanyStatus(companyId, newStatus);
      setCompany(response.company);
    } catch (error) {
      setCompany((c) => ({ ...c, status: prev }));
      setStatusError(error.response?.data?.error || 'Failed to update status.');
    }
  };

  const handleDelete = async () => {
    setDeleteError(null);
    if (!window.confirm(`Delete company "${company.company_name}"? This cannot be undone.`)) return;
    try {
      await companyService.deleteCompany(companyId);
      navigate('/crm');
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to delete company.';
      setDeleteError(message);
    }
  };

  if (loading) {
    return (
      <div className="relative z-10 min-h-screen pb-16">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div role="status" className="space-y-6">
            <span className="sr-only">Loading…</span>
            <Skeleton className="h-4 w-32" />
            <div className="space-y-3">
              <Skeleton className="h-9 w-72 max-w-full" />
              <SkeletonText lines={2} />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24 rounded-xl" />
              <Skeleton className="h-10 w-24 rounded-xl" />
              <Skeleton className="h-10 w-28 rounded-xl" />
            </div>
            <div className="glass-card space-y-4 rounded-2xl border border-primary-500/10 p-6">
              <SkeletonText lines={5} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loadError || !company) {
    return (
      <div className="relative z-10 min-h-screen pb-16">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => navigate('/crm')}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-foreground"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back to CRM
          </button>
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600">
            {loadError || 'Company not found.'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 min-h-screen pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate('/crm')}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-muted transition hover:text-foreground"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to CRM
        </button>

        <div className="glass-card mb-8 rounded-2xl border border-primary-500/10 p-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <CompanyAvatar name={company.company_name} className="h-14 w-14 text-lg" />
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-semibold text-foreground">{company.company_name}</h1>
                    <StatusBadge status={company.status || 'new'} />
                  </div>
                  <p className="mt-2 text-muted">
                    {company.domain}
                    {[company.city, company.country].filter(Boolean).length > 0 &&
                      ` · ${[company.city, company.country].filter(Boolean).join(', ')}`}
                  </p>
                  <div className="mt-3 max-w-xs">
                    <StatusSelect
                      value={company.status || 'new'}
                      onChange={handleStatusChange}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => { setEditError(null); setShowEditForm(true); }} className="btn-secondary flex items-center gap-2">
                  <PencilIcon className="h-4 w-4" />
                  Edit
                </button>
                <button type="button" onClick={handleDelete} className="inline-flex items-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-500/20">
                  <TrashIcon className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>

            <PipelineStepper currentStatus={company.status || 'new'} />

            <div className="flex flex-wrap gap-3 text-sm">
              <span className="chip border border-primary-500/25 bg-primary-500/10">Emails: {company.emails_count ?? 0}</span>
              <span className="chip border border-primary-500/25 bg-primary-500/10">Prospects: {company.prospects_count ?? 0}</span>
              <span className="chip border border-primary-500/25 bg-primary-500/10">Financials: {company.financials_count ?? 0}</span>
            </div>
          </div>
        </div>

        {(deleteError || statusError) && (
          <div className="mb-6 space-y-2">
            {deleteError && <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600">{deleteError}</div>}
            {statusError && <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600">{statusError}</div>}
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-2 border-b border-primary-500/10 pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              {tab.label}
              {tab.key === 'prospects' && company.prospects_count != null && ` (${company.prospects_count})`}
              {tab.key === 'emails' && company.emails_count != null && ` (${company.emails_count})`}
              {tab.key === 'financials' && company.financials_count != null && ` (${company.financials_count})`}
            </button>
          ))}
        </div>

        {activeTab === 'info' && (
          <div className="glass-card space-y-8 rounded-2xl border border-primary-500/10 p-6">
            <section>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Identité</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">Domain</div>
                  <div className="mt-1 text-foreground">{company.domain || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">Website</div>
                  <div className="mt-1 text-foreground">
                    {company.website ? (
                      <a href={company.website} target="_blank" rel="noreferrer" className="text-primary-600 hover:underline">
                        {company.website}
                      </a>
                    ) : 'N/A'}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">Company Type</div>
                  <div className="mt-1 capitalize text-foreground">{company.company_type || 'N/A'}</div>
                </div>
              </div>
            </section>
            <section>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Localisation</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">Country</div>
                  <div className="mt-1 text-foreground">{company.country || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">City</div>
                  <div className="mt-1 text-foreground">{company.city || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">Region</div>
                  <div className="mt-1 text-foreground">{company.region || 'N/A'}</div>
                </div>
              </div>
            </section>
            <section>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted">Suivi</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">Status</div>
                  <div className="mt-1"><StatusBadge status={company.status || 'new'} /></div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">Founded Year</div>
                  <div className="mt-1 text-foreground">{company.founded_year || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">Last Updated</div>
                  <div className="mt-1 text-foreground">{company.updated_at ? new Date(company.updated_at).toLocaleString() : 'N/A'}</div>
                </div>
              </div>
            </section>
            {company.notes && (
              <div className="rounded-xl bg-[var(--surface-muted)] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">Notes</div>
                <p className="mt-2 whitespace-pre-wrap text-foreground">{company.notes}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'prospects' && <ProspectsTab companyId={companyId} onMutate={loadCompany} />}
        {activeTab === 'emails' && <EmailsTab companyId={companyId} onMutate={loadCompany} />}
        {activeTab === 'financials' && <FinancialsTab companyId={companyId} onMutate={loadCompany} />}
      </div>

      {showEditForm && (
        <CompanyEditForm
          company={company}
          onSubmit={handleEditSubmit}
          onCancel={() => { setShowEditForm(false); setEditError(null); }}
          error={editError}
        />
      )}
    </div>
  );
};

export default CrmCompanyDetail;
