import React from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';
import { COMPANY_STATUSES, STATUS_LABELS } from './crmConstants';

const PipelineStepper = ({ currentStatus }) => {
  const currentIndex = COMPANY_STATUSES.indexOf(currentStatus);

  return (
    <div className="w-full overflow-x-auto">
      <div className="flex min-w-[320px] items-center justify-between gap-1 sm:gap-2">
        {COMPANY_STATUSES.map((status, index) => {
          const isPast = currentIndex > index;
          const isCurrent = currentIndex === index;
          const isFuture = currentIndex < index;

          return (
            <React.Fragment key={status}>
              <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition ${
                    isCurrent
                      ? 'border-primary-600 bg-primary-600 text-white ring-4 ring-primary-500/20'
                      : isPast
                        ? 'border-primary-600 bg-primary-600 text-white'
                        : 'border-primary-500/25 bg-transparent text-muted'
                  }`}
                >
                  {isPast ? <CheckIcon className="h-4 w-4" /> : index + 1}
                </div>
                <span
                  className={`hidden text-center text-[10px] font-semibold leading-tight sm:block ${
                    isCurrent ? 'text-primary-700 dark:text-primary-300' : isFuture ? 'text-muted' : 'text-foreground'
                  }`}
                >
                  {STATUS_LABELS[status]}
                </span>
              </div>
              {index < COMPANY_STATUSES.length - 1 && (
                <div
                  className={`mb-5 h-0.5 flex-1 min-w-[8px] ${
                    isPast ? 'bg-primary-600' : 'bg-primary-500/20'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {currentStatus && (
        <p className="mt-2 text-center text-sm font-medium text-primary-700 dark:text-primary-300 sm:hidden">
          {STATUS_LABELS[currentStatus]}
        </p>
      )}
    </div>
  );
};

export default PipelineStepper;
