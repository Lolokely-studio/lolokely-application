import React, { useCallback, useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { companyService } from '../../services/crmService';
import { COMPANY_STATUSES, KANBAN_PAGE_SIZE, STATUS_LABELS } from './crmConstants';
import CompanyCard from './CompanyCard';

const emptyColumnState = () =>
  Object.fromEntries(
    COMPANY_STATUSES.map((status) => [status, { items: [], page: 0, total: 0, loading: false, hasMore: true }])
  );

const KanbanColumn = ({ status, column, activeId }) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="flex min-w-[260px] flex-1 flex-col">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{STATUS_LABELS[status]}</h3>
        <span className="rounded-full bg-primary-500/15 px-2 py-0.5 text-xs font-semibold text-primary-700">
          {column.total}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[200px] flex-1 flex-col gap-2 rounded-xl border p-2 transition ${
          isOver ? 'border-primary-500/50 bg-primary-500/10' : 'border-primary-500/15 bg-primary-500/5'
        }`}
      >
        {column.items.map((company) => (
          <CompanyCard
            key={company.id}
            company={company}
            isDragging={String(company.id) === activeId}
          />
        ))}
        {column.items.length === 0 && !column.loading && (
          <p className="py-8 text-center text-xs text-muted">Aucune société</p>
        )}
      </div>
    </div>
  );
};

const KanbanBoard = ({ filters, onStatusChange, onCountsChange }) => {
  const [columns, setColumns] = useState(emptyColumnState);
  const [activeCompany, setActiveCompany] = useState(null);
  const [error, setError] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const loadColumn = useCallback(async (status, page = 1, append = false) => {
    setColumns((prev) => ({
      ...prev,
      [status]: { ...prev[status], loading: true },
    }));

    try {
      const response = await companyService.getCompanies({
        ...filters,
        status,
        page,
        per_page: KANBAN_PAGE_SIZE,
      });
      const items = response.companies || [];
      const total = response.total || 0;

      setColumns((prev) => ({
        ...prev,
        [status]: {
          items: append ? [...prev[status].items, ...items] : items,
          page,
          total,
          loading: false,
          hasMore: page * KANBAN_PAGE_SIZE < total,
        },
      }));
    } catch (err) {
      console.error('Kanban load error:', err);
      setColumns((prev) => ({
        ...prev,
        [status]: { ...prev[status], loading: false },
      }));
    }
  }, [filters]);

  const loadAllColumns = useCallback(async () => {
    await Promise.all(COMPANY_STATUSES.map((status) => loadColumn(status, 1, false)));
    if (onCountsChange) {
      try {
        const countsData = await companyService.getStatusCounts(filters);
        onCountsChange(countsData);
      } catch (err) {
        console.error('Failed to refresh counts:', err);
      }
    }
  }, [filters, loadColumn, onCountsChange]);

  useEffect(() => {
    loadAllColumns();
  }, [loadAllColumns]);

  const handleDragStart = (event) => {
    const company = event.active.data.current?.company;
    setActiveCompany(company || null);
  };

  const handleDragEnd = async (event) => {
    setActiveCompany(null);
    const { active, over } = event;
    if (!over || !active.data.current?.company) return;

    const company = active.data.current.company;
    const newStatus = over.id;
    if (!COMPANY_STATUSES.includes(newStatus) || company.status === newStatus) return;

    const oldStatus = company.status || 'new';

    setColumns((prev) => {
      const next = { ...prev };
      next[oldStatus] = {
        ...next[oldStatus],
        items: next[oldStatus].items.filter((c) => c.id !== company.id),
        total: Math.max(0, next[oldStatus].total - 1),
      };
      const updated = { ...company, status: newStatus };
      next[newStatus] = {
        ...next[newStatus],
        items: [updated, ...next[newStatus].items],
        total: next[newStatus].total + 1,
      };
      return next;
    });

    try {
      await onStatusChange(company, newStatus);
    } catch (err) {
      setError(err.response?.data?.error || 'Échec du changement de statut.');
      loadAllColumns();
    }
  };

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {COMPANY_STATUSES.map((status) => (
            <div key={status} className="flex flex-col">
              <KanbanColumn
                status={status}
                column={columns[status]}
                activeId={activeCompany ? String(activeCompany.id) : null}
              />
              {columns[status].hasMore && (
                <button
                  type="button"
                  onClick={() => loadColumn(status, columns[status].page + 1, true)}
                  disabled={columns[status].loading}
                  className="mt-2 rounded-lg border border-primary-500/25 bg-primary-500/10 px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-primary-500/20 disabled:opacity-50"
                >
                  {columns[status].loading ? 'Chargement…' : 'Charger plus'}
                </button>
              )}
            </div>
          ))}
        </div>
        <DragOverlay>
          {activeCompany ? <CompanyCard company={activeCompany} isDragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

export default KanbanBoard;
