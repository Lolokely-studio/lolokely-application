import React from 'react';
import { COMPANY_STATUSES, STATUS_LABELS } from './crmConstants';

const StatusSelect = ({
  value,
  onChange,
  className = '',
  size = 'md',
  allowEmpty = false,
  emptyLabel = 'Tous les statuts',
  disabled = false,
  stopPropagation = false,
}) => {
  const sizeClass = size === 'sm' ? '!py-1.5 text-xs' : '';

  const handleClick = (e) => {
    if (stopPropagation) e.stopPropagation();
  };

  return (
    <div onClick={handleClick} onKeyDown={handleClick}>
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={disabled}
        className={`input-field ${sizeClass} ${className}`}
        onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      >
        {allowEmpty && <option value="">{emptyLabel}</option>}
        {COMPANY_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </div>
  );
};

export default StatusSelect;
