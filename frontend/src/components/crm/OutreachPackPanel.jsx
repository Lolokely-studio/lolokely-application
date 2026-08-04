import React, { useCallback, useEffect, useState } from 'react';
import { ArrowPathIcon, ClipboardDocumentIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { crmAiService } from '../../services/crmAiService';
import { Skeleton } from '../Skeleton';

const OutreachPackPanel = ({ companyId }) => {
  const [pack, setPack] = useState(null);
  const [tab, setTab] = useState('email');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [copyHint, setCopyHint] = useState(null);

  const loadPack = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await crmAiService.getOutreachPack(companyId);
      if (data?.pack === null || data?.pack_id == null) {
        setPack(null);
      } else {
        setPack(data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Impossible de charger le pack outreach.');
      setPack(null);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadPack();
  }, [loadPack]);

  const handleGenerate = async ({ confirm = false } = {}) => {
    if (confirm && pack && !window.confirm('Régénérer le pack outreach ? Le contenu actuel sera remplacé par une nouvelle version.')) {
      return;
    }
    setGenerating(true);
    setError(null);
    setCopyHint(null);
    try {
      const data = await crmAiService.generateOutreachPack(companyId);
      setPack(data);
      setTab('email');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.details || 'La génération a échoué.');
    } finally {
      setGenerating(false);
    }
  };

  const copyText = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyHint(`${label} copié`);
      setTimeout(() => setCopyHint(null), 2000);
    } catch {
      setCopyHint('Copie impossible');
    }
  };

  const downloadMarkdown = () => {
    if (!pack?.proposal_markdown) return;
    const blob = new Blob([pack.proposal_markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prestation-${companyId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const busy = loading || generating;

  return (
    <div className="glass-card mb-8 rounded-2xl border border-primary-500/10 p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Outreach pack</h2>
          <p className="mt-1 text-sm text-muted">
            Email d&apos;outreach + document de prestation (IA)
          </p>
          {pack?.created_at && (
            <p className="mt-1 text-xs text-muted">
              Généré le {new Date(pack.created_at).toLocaleString('fr-FR')}
              {pack.model_used ? ` · ${pack.model_used}` : ''}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pack ? (
            <button
              type="button"
              onClick={() => handleGenerate({ confirm: true })}
              disabled={busy}
              className="btn-secondary inline-flex items-center gap-2 disabled:opacity-50"
            >
              {generating ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-600/30 border-t-primary-600" />
              ) : (
                <ArrowPathIcon className="h-4 w-4" />
              )}
              Régénérer
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={busy}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50"
            >
              {generating ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : null}
              Générer le pack outreach
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {copyHint && (
        <div className="mb-4 rounded-xl border border-primary-500/20 bg-primary-500/10 px-4 py-2 text-sm text-foreground">
          {copyHint}
        </div>
      )}

      {loading ? (
        <div className="space-y-3" role="status">
          <span className="sr-only">Chargement…</span>
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : !pack ? (
        <div className="rounded-xl border border-primary-500/15 bg-primary-500/5 px-4 py-8 text-center">
          <p className="text-sm text-muted">
            Aucun pack pour cette société. Générez un email + une proposition en un clic.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2 border-b border-primary-500/10 pb-1">
            {[
              { key: 'email', label: 'Email' },
              { key: 'prestation', label: 'Prestation' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition ${
                  tab === t.key
                    ? 'border-b-2 border-primary-600 text-primary-600'
                    : 'text-muted hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'email' ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary inline-flex items-center gap-2 text-sm"
                  onClick={() =>
                    copyText(
                      `Sujet: ${pack.email_subject}\n\n${pack.email_body}`,
                      'Email'
                    )
                  }
                >
                  <ClipboardDocumentIcon className="h-4 w-4" />
                  Copier l&apos;email
                </button>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">Sujet</div>
                <p className="mt-1 font-medium text-foreground">{pack.email_subject}</p>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted">Corps</div>
                <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-[var(--surface-muted)] p-4 text-sm text-foreground font-sans">
                  {pack.email_body}
                </pre>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-secondary inline-flex items-center gap-2 text-sm"
                  onClick={() => copyText(pack.proposal_markdown, 'Markdown')}
                >
                  <ClipboardDocumentIcon className="h-4 w-4" />
                  Copier le markdown
                </button>
                <button
                  type="button"
                  className="btn-secondary inline-flex items-center gap-2 text-sm"
                  onClick={downloadMarkdown}
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Download .md
                </button>
              </div>
              <pre className="max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-xl bg-[var(--surface-muted)] p-4 text-sm text-foreground font-sans">
                {pack.proposal_markdown}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OutreachPackPanel;
