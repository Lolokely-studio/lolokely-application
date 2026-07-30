import React from 'react';
import { COMPANY_STATUSES, STATUS_LABELS } from './crmConstants';

const StatusFilterChips = ({ activeStatus, counts = {}, total = 0, onChange }) => {
  const chipClass = (active) =>
    active
      ? 'border-primary-500 bg-primary-600/90 text-white shadow-sm'
      : 'border-primary-500/25 bg-primary-500/10 text-foreground hover:bg-primary-500/20';

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange('')}
        className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${chipClass(!activeStatus)}`}
      >
        Tous ({total})
      </button>
      {COMPANY_STATUSES.map((status) => (
        <button
          key={status}
          type="button"
          onClick={() => onChange(status)}
          className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${chipClass(activeStatus === status)}`}
        >
          {STATUS_LABELS[status]} ({counts[status] ?? 0})
        </button>
      ))}
    </div>
  );
};

export default StatusFilterChips;
