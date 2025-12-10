-- Enable UUID generation (either is fine; keep both for portability)
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- USERS
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email varchar(120) not null unique,
  password_hash varchar(128) not null,
  first_name varchar(50) not null,
  last_name varchar(50) not null,
  is_admin boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- TASKS
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title varchar(200) not null,
  description text,
  status varchar(20) not null default 'todo' check (status in ('todo','in_progress','completed')),
  priority varchar(10) not null default 'medium' check (priority in ('low','medium','high')),
  due_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- SUBTASKS
create table if not exists public.subtasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  title varchar(200) not null,
  description text,
  status varchar(20) not null default 'todo' check (status in ('todo','in_progress','completed')),
  priority varchar(10) not null default 'medium' check (priority in ('low','medium','high')),
  due_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- TASK ASSIGNMENTS
create table if not exists public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (task_id, user_id)
);

-- SUBTASK ASSIGNMENTS
create table if not exists public.subtask_assignments (
  id uuid primary key default gen_random_uuid(),
  subtask_id uuid not null references public.subtasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique (subtask_id, user_id)
);

-- SOCIAL MEDIA POSTS
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  theme varchar(200) not null,
  description text,
  platform varchar(50) not null,
  tonality varchar(50) not null,
  language varchar(10) not null default 'en',
  target_audience text,
  generated_variations jsonb,
  selected_variation text,
  media_url text,
  media_type varchar(20) check (media_type in ('image', 'video', null)),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- USER POST PREFERENCES (for learning from choices)
create table if not exists public.user_post_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  preferred_platforms jsonb default '[]'::jsonb,
  preferred_tonalities jsonb default '[]'::jsonb,
  preferred_languages jsonb default '[]'::jsonb,
  common_themes jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id)
);

-- NOTIFICATIONS
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type varchar(50) not null check (type in ('task_created', 'task_assigned', 'subtask_assigned', 'leave_requested', 'leave_approved', 'leave_rejected')),
  message text not null,
  related_task_id uuid references public.tasks(id) on delete cascade,
  related_subtask_id uuid references public.subtasks(id) on delete cascade,
  related_leave_request_id uuid references public.leave_requests(id) on delete cascade,
  created_by_user_id uuid references public.users(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz default now()
);

-- LEAVE REQUESTS
create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  leave_type varchar(50) not null check (leave_type in ('vacation', 'sick', 'personal', 'other')),
  reason text,
  status varchar(20) not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Helpful indexes
create index if not exists idx_tasks_created_at on public.tasks(created_at);
create index if not exists idx_subtasks_task_id on public.subtasks(task_id);
create index if not exists idx_task_assignments_task_id on public.task_assignments(task_id);
create index if not exists idx_task_assignments_user_id on public.task_assignments(user_id);
create index if not exists idx_subtask_assignments_subtask_id on public.subtask_assignments(subtask_id);
create index if not exists idx_subtask_assignments_user_id on public.subtask_assignments(subtask_id);
create index if not exists idx_social_posts_user_id on public.social_posts(user_id);
create index if not exists idx_social_posts_created_at on public.social_posts(created_at);
create index if not exists idx_user_post_preferences_user_id on public.user_post_preferences(user_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_is_read on public.notifications(is_read);
create index if not exists idx_notifications_created_at on public.notifications(created_at);
create index if not exists idx_leave_requests_user_id on public.leave_requests(user_id);
create index if not exists idx_leave_requests_status on public.leave_requests(status);
create index if not exists idx_leave_requests_start_date on public.leave_requests(start_date);
create index if not exists idx_leave_requests_end_date on public.leave_requests(end_date);
create index if not exists idx_users_is_admin on public.users(is_admin);