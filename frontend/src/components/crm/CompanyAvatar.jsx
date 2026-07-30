import React from 'react';

const CompanyAvatar = ({ name, className = '' }) => {
  const initial = (name || '?').trim().charAt(0).toUpperCase();

  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-500/20 text-sm font-bold text-primary-700 dark:text-primary-200 ${className}`}
      aria-hidden
    >
      {initial}
    </div>
  );
};

export default CompanyAvatar;
