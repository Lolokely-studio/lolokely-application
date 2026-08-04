import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowPathIcon,
  ClipboardDocumentIcon,
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { crmAiService } from '../../services/crmAiService';
import { Skeleton } from '../Skeleton';
import MarkdownViewer from './MarkdownViewer';

const ConfirmRegenerateModal = ({ onConfirm, onCancel }) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="regenerate-pack-title"
    >
      <div
        className="glass-panel mx-4 w-full max-w-md px-6 py-6 sm:px-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="regenerate-pack-title" className="text-lg font-semibold text-foreground">
            Régénérer le pack ?
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-muted transition hover:text-foreground"
            aria-label="Fermer"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <p className="text-sm text-muted">
          Le contenu actuel (email + prestation) sera remplacé par une nouvelle version générée par l&apos;IA.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="btn-secondary">
            Annuler
          </button>
          <button type="button" onClick={onConfirm} className="btn-primary">
            Régénérer
          </button>
        </div>
      </div>
    </div>
  );
};

const OutreachPackPanel = ({ companyId }) => {
  const [pack, setPack] = useState(null);
  const [tab, setTab] = useState('email');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [error, setError] = useState(null);
  const [copyHint, setCopyHint] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const pdfSourceRef = useRef(null);

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

  const handleGenerate = async () => {
    setShowConfirm(false);
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

  const requestRegenerate = () => {
    if (pack) {
      setShowConfirm(true);
      return;
    }
    handleGenerate();
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

  const downloadPdf = async () => {
    if (!pack?.proposal_markdown || !pdfSourceRef.current) return;
    setPdfBusy(true);
    setError(null);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const source = pdfSourceRef.current;
      await html2pdf()
        .set({
          margin: [12, 12, 12, 12],
          filename: `prestation-${companyId}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'] },
        })
        .from(source)
        .save();
      setCopyHint('PDF téléchargé');
      setTimeout(() => setCopyHint(null), 2000);
    } catch (err) {
      console.error('PDF export failed:', err);
      setError('Impossible de générer le PDF.');
    } finally {
      setPdfBusy(false);
    }
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
              onClick={requestRegenerate}
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
              onClick={handleGenerate}
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

      {showConfirm && (
        <ConfirmRegenerateModal
          onConfirm={handleGenerate}
          onCancel={() => setShowConfirm(false)}
        />
      )}

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
                <button
                  type="button"
                  className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-50"
                  onClick={downloadPdf}
                  disabled={pdfBusy}
                >
                  {pdfBusy ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <DocumentArrowDownIcon className="h-4 w-4" />
                  )}
                  Download PDF
                </button>
              </div>

              <div className="max-h-[28rem] overflow-auto rounded-xl border border-primary-500/10 bg-[var(--surface-muted)] p-5">
                <MarkdownViewer markdown={pack.proposal_markdown} />
              </div>

              {/* Off-screen light clone used only for PDF export */}
              <div
                aria-hidden="true"
                style={{
                  position: 'fixed',
                  left: '-10000px',
                  top: 0,
                  width: '720px',
                  pointerEvents: 'none',
                }}
              >
                <div
                  ref={pdfSourceRef}
                  style={{ background: '#ffffff', color: '#0f172a', padding: '24px' }}
                >
                  <MarkdownViewer markdown={pack.proposal_markdown} printSafe />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default OutreachPackPanel;
