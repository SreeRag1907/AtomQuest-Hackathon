-- 0006_escalation.sql
-- Rule-based escalation engine.
-- Admin-defined rules fire when SLAs are breached during a cycle:
--   * goals_not_submitted — employee has no submitted sheet N days after goal_setting_opens
--   * goals_not_approved  — manager hasn't acted on a submitted sheet within N days
--   * checkin_not_done    — approved/locked sheet has no actuals N days into the active quarter
-- Each fire writes a row in escalation_log so HR/admin can track resolution.

create table if not exists escalation_rules (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  trigger_event   text not null check (
    trigger_event in ('goals_not_submitted', 'goals_not_approved', 'checkin_not_done')
  ),
  threshold_days  int  not null check (threshold_days > 0),
  notify_employee boolean not null default true,
  notify_manager  boolean not null default true,
  notify_hr       boolean not null default false,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  created_by      uuid references profiles(id),
  updated_at      timestamptz not null default now()
);

create index if not exists escalation_rules_active_idx
  on escalation_rules(is_active, trigger_event);

create trigger escalation_rules_updated_at
  before update on escalation_rules
  for each row execute function set_updated_at();

create table if not exists escalation_log (
  id            uuid primary key default gen_random_uuid(),
  rule_id       uuid references escalation_rules(id) on delete set null,
  employee_id   uuid not null references profiles(id) on delete cascade,
  trigger_event text not null,
  fired_at      timestamptz not null default now(),
  resolved_at   timestamptz,
  resolved_by   uuid references profiles(id),
  notes         text
);

create index if not exists escalation_log_emp_idx on escalation_log(employee_id);
create index if not exists escalation_log_fired_idx on escalation_log(fired_at desc);
-- One open row per rule/employee/calendar day (UTC); plain timestamptz::date is STABLE, not index-safe.
create unique index if not exists escalation_log_dedupe_idx
  on escalation_log(rule_id, employee_id, ((fired_at at time zone 'UTC')::date))
  where resolved_at is null;

-- ============================================================
-- RLS — admin-only writes; managers and admins can read the log
-- ============================================================
alter table escalation_rules enable row level security;
alter table escalation_log enable row level security;

create policy "escalation_rules: admin all" on escalation_rules
  for all using (is_admin()) with check (is_admin());

create policy "escalation_rules: read for managers/admins" on escalation_rules
  for select using (public.current_role() in ('manager', 'admin'));

create policy "escalation_log: admin all" on escalation_log
  for all using (is_admin()) with check (is_admin());

create policy "escalation_log: managers see own team" on escalation_log
  for select using (
    public.current_role() = 'manager' and is_manager_of(employee_id)
  );

create policy "escalation_log: employee read own" on escalation_log
  for select using (employee_id = auth.uid());

-- ============================================================
-- Seed sensible default rules so admin has something to demo
-- ============================================================
insert into escalation_rules (name, trigger_event, threshold_days, notify_employee, notify_manager, notify_hr)
values
  ('Goals not submitted in 7 days', 'goals_not_submitted', 7,  true,  true,  false),
  ('Goals pending approval > 5 days', 'goals_not_approved', 5,  false, true,  true),
  ('Quarterly check-in overdue', 'checkin_not_done',  10, true,  true,  false)
on conflict do nothing;
