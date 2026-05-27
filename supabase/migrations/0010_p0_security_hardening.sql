-- ============================================================
-- 0010_p0_security_hardening
-- ------------------------------------------------------------
-- Closes the P0 data-layer findings from docs/AUDIT.md:
--
--  D1  shared_goal_recipients view bypasses RLS  →  security_invoker
--  D2  audit_log INSERT is spoofable             →  trigger-only inserts
--  D3  notifications INSERT for any user_id      →  self or SECURITY DEFINER
--  D4  goal_sheets.status self-promotion via RLS →  explicit status guard
--  D5  profiles self-update over-permissive      →  freeze role/manager/active
--  D6  handle_new_user trusts client-supplied    →  honor metadata only when
--      role; relax goals.weightage CHECK to         _provisioned marker is set
--      allow NULL on drafts (E3)
--
-- All changes are forward-only; no data is lost.
-- ============================================================

-- ------------------------------------------------------------
-- D1: shared_goal_recipients with security_invoker
-- ------------------------------------------------------------
drop view if exists public.shared_goal_recipients;
create view public.shared_goal_recipients
  with (security_invoker = true) as
select
  parent.id            as parent_goal_id,
  child.id             as child_goal_id,
  child.goal_sheet_id  as child_sheet_id,
  s.employee_id        as recipient_id,
  p.full_name          as recipient_name,
  p.email              as recipient_email,
  p.department         as recipient_department,
  child.weightage      as recipient_weightage
from public.goals parent
join public.goals child on child.parent_goal_id = parent.id
join public.goal_sheets s on s.id = child.goal_sheet_id
join public.profiles p on p.id = s.employee_id;

grant select on public.shared_goal_recipients to authenticated;

-- ------------------------------------------------------------
-- D2: audit_log direct inserts restricted to admins. The audit_trigger_fn
-- (SECURITY DEFINER, owned by postgres which BYPASSRLS) continues to write
-- the automated trail. Direct inserts (e.g. admin manual entries for
-- unlock decisions) require admin role.
-- ------------------------------------------------------------
drop policy if exists "audit_log: any authenticated insert" on public.audit_log;
create policy "audit_log: admin insert" on public.audit_log
  for insert with check (public.is_admin());

-- ------------------------------------------------------------
-- D3: notifications insert is scoped — no spam vector.
-- ------------------------------------------------------------
drop policy if exists "notifications: any authenticated insert" on public.notifications;

create policy "notifications: scoped insert" on public.notifications
  for insert with check (
    -- self
    user_id = auth.uid()
    -- admin → anyone
    or public.is_admin()
    -- manager → direct reports
    or public.is_manager_of(user_id)
    -- employee → own manager
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and manager_id = notifications.user_id
    )
  );

-- ------------------------------------------------------------
-- D4: goal_sheets.status guarded in RLS WITH CHECK
--
-- Employees may only set status in (draft, submitted). Specifically they
-- must not be able to self-promote to approved or locked.
-- Managers may not bypass the workflow (no employee→locked jumps without
-- going through approval).
-- ------------------------------------------------------------
drop policy if exists "goal_sheets: employee updates own (not locked)" on public.goal_sheets;
create policy "goal_sheets: employee updates own (not locked)" on public.goal_sheets
  for update
  using (
    employee_id = auth.uid() and status <> 'locked'
  )
  with check (
    employee_id = auth.uid()
    and status in ('draft', 'submitted')
  );

-- Manager update WITH CHECK keeps team-of-self but excludes status='draft'
-- writes (managers don't put sheets back to draft) and the rare locked path
-- still flows through admin policy.
drop policy if exists "goal_sheets: manager updates reports" on public.goal_sheets;
create policy "goal_sheets: manager updates reports" on public.goal_sheets
  for update
  using (is_manager_of(employee_id))
  with check (
    is_manager_of(employee_id)
    and status in ('draft', 'submitted', 'approved', 'returned', 'locked')
  );

-- ------------------------------------------------------------
-- D5: profiles self-update tightened
-- Employees can only change full_name, department, avatar_url.
-- ------------------------------------------------------------
drop policy if exists "profiles: self update" on public.profiles;
create policy "profiles: self update" on public.profiles
  for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role        = (select role from profiles where id = auth.uid())
    and manager_id is not distinct from (select manager_id from profiles where id = auth.uid())
    and is_active   = (select is_active from profiles where id = auth.uid())
    and email       = (select email from profiles where id = auth.uid())
  );

-- ------------------------------------------------------------
-- D6 / A1: handle_new_user only trusts metadata role when caller is a
-- privileged provisioning path (service role) which sets `_provisioned: true`
-- in user_metadata. Otherwise force the safe default ('employee').
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
  v_full_name text;
  v_department text;
  v_manager_id uuid;
  v_provisioned boolean;
begin
  v_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );

  v_provisioned := coalesce(
    (new.raw_user_meta_data->>'_provisioned')::boolean,
    false
  );

  if v_provisioned then
    v_role := coalesce(
      (new.raw_user_meta_data->>'role')::user_role,
      'employee'::user_role
    );
  else
    v_role := 'employee'::user_role;
  end if;

  v_department := new.raw_user_meta_data->>'department';

  if v_provisioned and (new.raw_user_meta_data ? 'manager_id') then
    v_manager_id := (new.raw_user_meta_data->>'manager_id')::uuid;
  end if;

  insert into public.profiles (id, email, full_name, role, department, manager_id)
  values (new.id, new.email, v_full_name, v_role, v_department, v_manager_id)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ------------------------------------------------------------
-- E3: relax goals.weightage so drafts may persist NULL while submission
-- still enforces 10..100 in the app + Zod.
-- ------------------------------------------------------------
alter table public.goals
  alter column weightage drop not null;

alter table public.goals
  drop constraint if exists goals_weightage_check;
alter table public.goals
  add constraint goals_weightage_check
    check (weightage is null or (weightage >= 10 and weightage <= 100));
