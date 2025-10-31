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

-- Helpful indexes
create index if not exists idx_tasks_created_at on public.tasks(created_at);
create index if not exists idx_subtasks_task_id on public.subtasks(task_id);
create index if not exists idx_task_assignments_task_id on public.task_assignments(task_id);
create index if not exists idx_task_assignments_user_id on public.task_assignments(user_id);
create index if not exists idx_subtask_assignments_subtask_id on public.subtask_assignments(subtask_id);
create index if not exists idx_subtask_assignments_user_id on public.subtask_assignments(user_id);