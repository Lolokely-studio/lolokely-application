import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { XMarkIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { crmAiService } from '../../services/crmAiService';
import { Skeleton } from '../Skeleton';

const TopCompaniesPanel = ({ open, onClose }) => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState(null);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [modelUsed, setModelUsed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState(null);

  const applyResponse = (data) => {
    setItems(data.items || []);
    setMessage(data.message || null);
    setGeneratedAt(data.generated_at || null);
    setModelUsed(data.model_used || null);
  };

  const loadLatest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await crmAiService.getLatestSuggestTop();
      applyResponse(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de charger le classement.');
      setItems([]);
      setMessage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRegenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const data = await crmAiService.suggestTop();
      applyResponse(data);
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details || 'La génération a échoué.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleItemClick = (companyId) => {
    onClose();
    navigate(`/crm/${companyId}`);
  };

  useEffect(() => {
    if (!open) return undefined;
    loadLatest();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open, loadLatest]);

  if (!open) return null;

  const busy = loading || regenerating;
  const emptyMessage = message || (items.length === 0 ? 'Aucun classement disponible.' : null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="glass-panel mx-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto px-6 py-6 sm:px-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Top 10 à contacter</h2>
            {generatedAt && (
              <p className="mt-1 text-xs text-muted">
                Généré le {new Date(generatedAt).toLocaleString('fr-FR')}
                {modelUsed ? ` · ${modelUsed}` : ''}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-muted transition hover:text-foreground" aria-label="Fermer">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-4 flex justify-end">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={busy}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
          >
            {regenerating ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <ArrowPathIcon className="h-4 w-4" />
            )}
            Régénérer
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <div className="space-y-3" role="status">
            <span className="sr-only">Chargement…</span>
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-primary-500/15 bg-primary-500/5 px-4 py-8 text-center">
            <p className="text-sm text-muted">{emptyMessage}</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => {
              const name = item.company?.company_name || item.company?.name || `Société #${item.company_id}`;
              return (
                <li key={item.company_id}>
                  <button
                    type="button"
                    onClick={() => handleItemClick(item.company_id)}
                    className="w-full rounded-xl border border-primary-500/15 bg-primary-500/5 px-4 py-3 text-left transition hover:border-primary-500/30 hover:bg-primary-500/10"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-lg bg-primary-600/90 px-1.5 text-xs font-bold text-white">
                            #{item.rank}
                          </span>
                          <span className="truncate font-semibold text-foreground">{name}</span>
                        </div>
                        {item.reasons?.length > 0 && (
                          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-muted">
                            {item.reasons.map((reason, idx) => (
                              <li key={idx}>{reason}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <span className="shrink-0 rounded-lg border border-primary-500/20 bg-primary-500/10 px-2 py-1 text-xs font-semibold text-foreground">
                        {Math.round((item.score ?? 0) * 100)}%
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TopCompaniesPanel;
