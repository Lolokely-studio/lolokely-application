import React from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { STATUS_BADGE_CLASSES, getStatusLabel } from './crmConstants';

const StatusBadge = ({ status, className = '' }) => {
  if (!status) {
    return <span className="text-muted">N/A</span>;
  }

  const badgeClass = STATUS_BADGE_CLASSES[status] || STATUS_BADGE_CLASSES.new;

  return (
    <span className={`chip capitalize border ${badgeClass} ${className}`}>
      {status === 'won' && <CheckCircleIcon className="mr-1 inline h-3.5 w-3.5" />}
      {getStatusLabel(status)}
    </span>
  );
};

export default StatusBadge;
