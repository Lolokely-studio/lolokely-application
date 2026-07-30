export const COMPANY_STATUSES = ['new', 'contacted', 'in_discussion', 'won', 'lost'];

export const STATUS_LABELS = {
  new: 'Nouveau',
  contacted: 'Contacté',
  in_discussion: 'En discussion',
  won: 'Gagné',
  lost: 'Perdu',
};

export const STATUS_BADGE_CLASSES = {
  new: 'bg-primary-500/15 text-primary-700 border-primary-500/25',
  contacted: 'bg-primary-500/25 text-primary-800 border-primary-500/35',
  in_discussion: 'bg-teal-500/15 text-teal-800 border-teal-500/25 dark:text-teal-200',
  won: 'bg-primary-600/20 text-primary-900 border-primary-600/40 dark:text-primary-100',
  lost: 'bg-red-500/15 text-red-700 border-red-500/25 dark:text-red-300',
};

export const getStatusLabel = (status) => STATUS_LABELS[status] || status || 'N/A';

export const CRM_VIEW_MODE_KEY = 'crm-view-mode';

export const KANBAN_PAGE_SIZE = 50;
