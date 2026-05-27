-- ============================================================
-- 0011 — Performance indexes & governance audit triggers
-- ============================================================
-- Phase 4 (P2) deliverable from the audit:
--   • Composite/partial indexes for the slowest read paths
--   • Audit triggers on governance tables so admin actions
--     leave the same trail goal_sheets/goals/achievements do.
-- ============================================================

-- ---------- Indexes ----------

-- Admin audit log: most queries filter by entity then order by time.
create index if not exists audit_log_entity_created_at_idx
  on public.audit_log (entity_type, entity_id, created_at desc);

-- Unlock-request joins: actions.ts repeatedly looks up the sheet for a request.
create index if not exists unlock_requests_goal_sheet_id_idx
  on public.unlock_requests (goal_sheet_id);

-- Open escalations: dashboards only care about rows still missing resolved_at.
create index if not exists escalation_log_open_rule_id_idx
  on public.escalation_log (rule_id)
  where resolved_at is null;

-- Notifications fetched per-user, ordered by created_at desc.
create index if not exists notifications_user_created_at_idx
  on public.notifications (user_id, created_at desc);

-- Manager dashboards filter by manager_id then is_active.
create index if not exists profiles_manager_active_idx
  on public.profiles (manager_id, is_active);

-- Goals are always loaded per sheet.
create index if not exists goals_goal_sheet_id_idx
  on public.goals (goal_sheet_id);

-- Achievements are scoped by goal_id then quarter.
create index if not exists achievements_goal_quarter_idx
  on public.achievements (goal_id, quarter);

-- Check-in comments (when present) are fetched by sheet/quarter.
create index if not exists checkin_comments_sheet_quarter_idx
  on public.checkin_comments (goal_sheet_id, quarter);

-- ---------- Governance audit triggers ----------
-- Reuse the existing public.audit_trigger_fn() defined in 0003.
-- We extend coverage to admin-managed tables so every admin action is recorded.

drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles
  after insert or update or delete on public.profiles
  for each row execute function public.audit_trigger_fn();

drop trigger if exists audit_cycles on public.cycles;
create trigger audit_cycles
  after insert or update or delete on public.cycles
  for each row execute function public.audit_trigger_fn();

drop trigger if exists audit_thrust_areas on public.thrust_areas;
create trigger audit_thrust_areas
  after insert or update or delete on public.thrust_areas
  for each row execute function public.audit_trigger_fn();

drop trigger if exists audit_unlock_requests on public.unlock_requests;
create trigger audit_unlock_requests
  after insert or update or delete on public.unlock_requests
  for each row execute function public.audit_trigger_fn();

drop trigger if exists audit_checkin_comments on public.checkin_comments;
create trigger audit_checkin_comments
  after insert or update or delete on public.checkin_comments
  for each row execute function public.audit_trigger_fn();

drop trigger if exists audit_escalation_rules on public.escalation_rules;
create trigger audit_escalation_rules
  after insert or update or delete on public.escalation_rules
  for each row execute function public.audit_trigger_fn();

drop trigger if exists audit_escalation_log on public.escalation_log;
create trigger audit_escalation_log
  after insert or update or delete on public.escalation_log
  for each row execute function public.audit_trigger_fn();
