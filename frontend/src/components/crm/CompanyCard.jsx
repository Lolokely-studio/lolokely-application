import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDraggable } from '@dnd-kit/core';
import CompanyAvatar from './CompanyAvatar';
import StatusBadge from './StatusBadge';

const CompanyCard = ({ company, isDragging = false }) => {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: String(company.id),
    data: { company },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const location = [company.city, company.country].filter(Boolean).join(', ');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`glass-card rounded-xl border border-primary-500/10 p-3 transition ${
        isDragging ? 'opacity-50 shadow-lg ring-2 ring-primary-500/30' : 'hover:border-primary-500/25'
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 cursor-grab touch-none text-muted hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to change status"
          {...listeners}
          {...attributes}
        >
          <span className="text-lg leading-none">⠿</span>
        </button>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => navigate(`/crm/${company.id}`)}
            className="flex w-full items-center gap-2 text-left"
          >
            <CompanyAvatar name={company.company_name} className="h-8 w-8 text-xs" />
            <div className="min-w-0">
              <div className="truncate font-semibold text-foreground">
                {company.company_name || 'Untitled'}
              </div>
              <div className="truncate text-xs text-muted">{company.domain || 'N/A'}</div>
            </div>
          </button>
          {location && <div className="mt-1 truncate text-xs text-muted">{location}</div>}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {company.company_type && (
              <span className="chip border border-primary-500/20 bg-primary-500/10 text-xs capitalize text-foreground">
                {company.company_type}
              </span>
            )}
            <StatusBadge status={company.status || 'new'} className="text-xs" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyCard;
