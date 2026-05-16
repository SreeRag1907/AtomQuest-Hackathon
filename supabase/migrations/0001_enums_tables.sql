-- ============================================================
-- AtomQuest Portal — Schema Foundation
-- Enums + tables only. RLS, triggers, and views in later files.
-- ============================================================

-- Required extensions
create extension if not exists "pgcrypto";

-- -----------------
-- Enums
-- -----------------
create type user_role as enum ('employee', 'manager', 'admin');

create type uom_type as enum (
  'numeric_min',   -- higher is better (numeric)
  'numeric_max',   -- lower is better (numeric)
  'percent_min',   -- higher is better (percent)
  'percent_max',   -- lower is better (percent)
  'timeline',      -- meet target date
  'zero'           -- target = zero (e.g. defects)
);

create type goal_status as enum (
  'draft',
  'submitted',
  'approved',
  'locked',
  'returned'
);

create type cycle_phase as enum (
  'not_started',
  'goal_setting',
  'q1',
  'q2',
  'q3',
  'q4_annual',
  'closed'
);

create type achievement_status as enum (
  'not_started',
  'on_track',
  'completed'
);

-- -----------------
-- Profiles (extends auth.users)
-- -----------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  role user_role not null default 'employee',
  manager_id uuid references profiles(id) on delete set null,
  department text,
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index profiles_manager_id_idx on profiles(manager_id);
create index profiles_role_idx on profiles(role);

-- -----------------
-- Cycles
-- -----------------
create table cycles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  current_phase cycle_phase not null default 'not_started',
  goal_setting_opens date,
  goal_setting_closes date,
  q1_opens date, q1_closes date,
  q2_opens date, q2_closes date,
  q3_opens date, q3_closes date,
  q4_opens date, q4_closes date,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);
-- only one active cycle at a time
create unique index cycles_one_active_idx on cycles(is_active) where is_active = true;

-- -----------------
-- Thrust Areas
-- -----------------
create table thrust_areas (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- -----------------
-- Goal Sheets (one per employee per cycle)
-- -----------------
create table goal_sheets (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references profiles(id) on delete cascade,
  cycle_id uuid not null references cycles(id) on delete cascade,
  status goal_status not null default 'draft',
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references profiles(id),
  locked_at timestamptz,
  return_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, cycle_id)
);
create index goal_sheets_employee_idx on goal_sheets(employee_id);
create index goal_sheets_cycle_idx on goal_sheets(cycle_id);
create index goal_sheets_status_idx on goal_sheets(status);

-- -----------------
-- Goals
-- -----------------
create table goals (
  id uuid primary key default gen_random_uuid(),
  goal_sheet_id uuid not null references goal_sheets(id) on delete cascade,
  thrust_area_id uuid references thrust_areas(id),
  title text not null,
  description text,
  uom_type uom_type not null,
  target numeric,
  target_date date,
  weightage numeric not null check (weightage >= 10 and weightage <= 100),
  is_shared boolean not null default false,
  parent_goal_id uuid references goals(id) on delete set null,
  display_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index goals_goal_sheet_idx on goals(goal_sheet_id);
create index goals_thrust_area_idx on goals(thrust_area_id);
create index goals_parent_idx on goals(parent_goal_id);

-- -----------------
-- Achievements (one per goal per quarter)
-- -----------------
create table achievements (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null references goals(id) on delete cascade,
  quarter text not null check (quarter in ('q1','q2','q3','q4')),
  actual_value numeric,
  actual_date date,
  status achievement_status not null default 'not_started',
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles(id),
  unique (goal_id, quarter)
);
create index achievements_goal_idx on achievements(goal_id);
create index achievements_quarter_idx on achievements(quarter);

-- -----------------
-- Check-in Comments
-- -----------------
create table checkin_comments (
  id uuid primary key default gen_random_uuid(),
  goal_sheet_id uuid not null references goal_sheets(id) on delete cascade,
  quarter text not null check (quarter in ('q1','q2','q3','q4')),
  manager_id uuid not null references profiles(id),
  comment text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index checkin_comments_sheet_quarter_idx on checkin_comments(goal_sheet_id, quarter);

-- -----------------
-- Audit Log
-- -----------------
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  changed_by uuid references profiles(id),
  before_value jsonb,
  after_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);
create index audit_log_entity_idx on audit_log(entity_type, entity_id);
create index audit_log_changed_by_idx on audit_log(changed_by);
create index audit_log_created_at_idx on audit_log(created_at desc);

-- -----------------
-- Notifications
-- -----------------
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_unread_idx
  on notifications(user_id, created_at desc)
  where is_read = false;
create index notifications_user_idx on notifications(user_id, created_at desc);

-- -----------------
-- Unlock Requests
-- -----------------
create table unlock_requests (
  id uuid primary key default gen_random_uuid(),
  goal_sheet_id uuid not null references goal_sheets(id) on delete cascade,
  requested_by uuid not null references profiles(id),
  reason text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index unlock_requests_status_idx on unlock_requests(status);

-- -----------------
-- updated_at maintenance
-- -----------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger goal_sheets_updated_at before update on goal_sheets
  for each row execute function set_updated_at();
create trigger goals_updated_at before update on goals
  for each row execute function set_updated_at();
create trigger achievements_updated_at before update on achievements
  for each row execute function set_updated_at();
create trigger checkin_comments_updated_at before update on checkin_comments
  for each row execute function set_updated_at();
