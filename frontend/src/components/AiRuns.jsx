import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { crmAiService } from '../services/crmAiService';
import { Skeleton } from './Skeleton';

const PAGE_SIZE = 50;

const AiRuns = () => {
  const [runs, setRuns] = useState([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await crmAiService.listRuns({ limit: PAGE_SIZE, offset });
      setRuns(data.runs || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de charger les AI runs.');
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }, [offset]);

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  const canPrev = offset > 0;
  const canNext = offset + PAGE_SIZE < total;

  return (
    <div className="relative z-10 min-h-screen pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-foreground">AI Runs</h1>
          <p className="mt-2 text-muted">
            Observabilité des agents CRM (Top 10 et outreach packs).
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="glass-card overflow-hidden rounded-2xl border border-primary-500/10">
          {loading ? (
            <div className="space-y-3 p-6" role="status">
              <span className="sr-only">Chargement…</span>
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : runs.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted">
              Aucun run IA pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-primary-500/10 text-sm">
                <thead className="bg-primary-500/5">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Société</th>
                    <th className="px-4 py-3">Modèle</th>
                    <th className="px-4 py-3">Durée</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Erreur</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-500/10">
                  {runs.map((run) => (
                    <tr key={run.id} className="hover:bg-primary-500/5">
                      <td className="whitespace-nowrap px-4 py-3 text-foreground">
                        {run.created_at
                          ? new Date(run.created_at).toLocaleString('fr-FR')
                          : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                        {run.run_type}
                      </td>
                      <td className="max-w-[12rem] truncate px-4 py-3 text-foreground">
                        {run.company_name || (run.company_id ? `#${run.company_id}` : '—')}
                      </td>
                      <td className="max-w-[14rem] truncate px-4 py-3 text-muted">
                        {run.model_used || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-foreground">
                        {run.duration_ms != null ? `${run.duration_ms} ms` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex rounded-lg border px-2 py-0.5 text-xs font-semibold ${
                            run.status === 'success'
                              ? 'border-primary-500/25 bg-primary-500/10 text-primary-800'
                              : 'border-red-500/25 bg-red-500/10 text-red-700'
                          }`}
                        >
                          {run.status}
                        </span>
                      </td>
                      <td className="max-w-[16rem] truncate px-4 py-3 text-muted" title={run.error_message || ''}>
                        {run.error_message
                          ? run.error_message.slice(0, 80) + (run.error_message.length > 80 ? '…' : '')
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-primary-500/10 px-4 py-3">
              <p className="text-xs text-muted">
                {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} sur {total}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary inline-flex items-center gap-1 disabled:opacity-50"
                  disabled={!canPrev || loading}
                  onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                  Préc.
                </button>
                <button
                  type="button"
                  className="btn-secondary inline-flex items-center gap-1 disabled:opacity-50"
                  disabled={!canNext || loading}
                  onClick={() => setOffset((o) => o + PAGE_SIZE)}
                >
                  Suiv.
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AiRuns;
