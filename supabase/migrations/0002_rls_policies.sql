-- ============================================================
-- Row Level Security policies
-- ============================================================

-- Helper SECURITY DEFINER functions so policies can read profiles
-- without infinite recursion when profiles itself has RLS.

create or replace function public.current_role()
returns user_role
language sql stable security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_manager_of(target_employee uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = target_employee and manager_id = auth.uid()
  );
$$;

create or replace function public.sheet_locked(sheet_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select status = 'locked' from goal_sheets where id = sheet_id;
$$;

grant execute on function public.current_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_manager_of(uuid) to authenticated;
grant execute on function public.sheet_locked(uuid) to authenticated;

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
alter table profiles enable row level security;

create policy "profiles: self read" on profiles
  for select using (id = auth.uid());

create policy "profiles: admin all" on profiles
  for all using (is_admin()) with check (is_admin());

create policy "profiles: manager reads team" on profiles
  for select using (manager_id = auth.uid());

create policy "profiles: any authenticated reads basic" on profiles
  for select using (auth.role() = 'authenticated');
-- Demo lean: allow basic directory reads. RLS still hides nothing sensitive
-- because profile rows don't carry secrets. Tighten in production if needed.

create policy "profiles: self update" on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

-- ------------------------------------------------------------
-- cycles
-- ------------------------------------------------------------
alter table cycles enable row level security;

create policy "cycles: read all" on cycles
  for select using (auth.role() = 'authenticated');

create policy "cycles: admin write" on cycles
  for all using (is_admin()) with check (is_admin());

-- ------------------------------------------------------------
-- thrust_areas
-- ------------------------------------------------------------
alter table thrust_areas enable row level security;

create policy "thrust_areas: read all" on thrust_areas
  for select using (auth.role() = 'authenticated');

create policy "thrust_areas: admin write" on thrust_areas
  for all using (is_admin()) with check (is_admin());

-- ------------------------------------------------------------
-- goal_sheets
-- ------------------------------------------------------------
alter table goal_sheets enable row level security;

create policy "goal_sheets: employee owns" on goal_sheets
  for select using (employee_id = auth.uid());

create policy "goal_sheets: manager reads reports" on goal_sheets
  for select using (is_manager_of(employee_id));

create policy "goal_sheets: admin all" on goal_sheets
  for all using (is_admin()) with check (is_admin());

create policy "goal_sheets: employee insert own" on goal_sheets
  for insert with check (employee_id = auth.uid());

create policy "goal_sheets: employee updates own (not locked)" on goal_sheets
  for update using (
    employee_id = auth.uid() and status <> 'locked'
  ) with check (
    employee_id = auth.uid()
  );

create policy "goal_sheets: manager updates reports" on goal_sheets
  for update using (is_manager_of(employee_id))
  with check (is_manager_of(employee_id));

-- ------------------------------------------------------------
-- goals
-- ------------------------------------------------------------
alter table goals enable row level security;

create policy "goals: read via sheet" on goals
  for select using (
    exists (
      select 1 from goal_sheets gs
      where gs.id = goals.goal_sheet_id
        and (
          gs.employee_id = auth.uid()
          or is_manager_of(gs.employee_id)
          or is_admin()
        )
    )
  );

create policy "goals: admin all" on goals
  for all using (is_admin()) with check (is_admin());

create policy "goals: employee writes own (not locked)" on goals
  for all using (
    exists (
      select 1 from goal_sheets gs
      where gs.id = goals.goal_sheet_id
        and gs.employee_id = auth.uid()
        and gs.status <> 'locked'
    )
  ) with check (
    exists (
      select 1 from goal_sheets gs
      where gs.id = goals.goal_sheet_id
        and gs.employee_id = auth.uid()
        and gs.status <> 'locked'
    )
  );

create policy "goals: manager updates reports' goals" on goals
  for update using (
    exists (
      select 1 from goal_sheets gs
      where gs.id = goals.goal_sheet_id
        and is_manager_of(gs.employee_id)
    )
  ) with check (
    exists (
      select 1 from goal_sheets gs
      where gs.id = goals.goal_sheet_id
        and is_manager_of(gs.employee_id)
    )
  );

-- ------------------------------------------------------------
-- achievements
-- ------------------------------------------------------------
alter table achievements enable row level security;

create policy "achievements: read via goal" on achievements
  for select using (
    exists (
      select 1 from goals g
      join goal_sheets gs on gs.id = g.goal_sheet_id
      where g.id = achievements.goal_id
        and (
          gs.employee_id = auth.uid()
          or is_manager_of(gs.employee_id)
          or is_admin()
        )
    )
  );

create policy "achievements: admin all" on achievements
  for all using (is_admin()) with check (is_admin());

create policy "achievements: employee writes own approved/locked goals" on achievements
  for all using (
    exists (
      select 1 from goals g
      join goal_sheets gs on gs.id = g.goal_sheet_id
      where g.id = achievements.goal_id
        and gs.employee_id = auth.uid()
        and gs.status in ('approved','locked')
    )
  ) with check (
    exists (
      select 1 from goals g
      join goal_sheets gs on gs.id = g.goal_sheet_id
      where g.id = achievements.goal_id
        and gs.employee_id = auth.uid()
        and gs.status in ('approved','locked')
    )
  );

-- ------------------------------------------------------------
-- checkin_comments
-- ------------------------------------------------------------
alter table checkin_comments enable row level security;

create policy "checkin_comments: read parties" on checkin_comments
  for select using (
    exists (
      select 1 from goal_sheets gs
      where gs.id = checkin_comments.goal_sheet_id
        and (
          gs.employee_id = auth.uid()
          or is_manager_of(gs.employee_id)
          or is_admin()
        )
    )
  );

create policy "checkin_comments: manager writes" on checkin_comments
  for all using (
    exists (
      select 1 from goal_sheets gs
      where gs.id = checkin_comments.goal_sheet_id
        and is_manager_of(gs.employee_id)
    ) or is_admin()
  ) with check (
    manager_id = auth.uid() and (
      exists (
        select 1 from goal_sheets gs
        where gs.id = checkin_comments.goal_sheet_id
          and is_manager_of(gs.employee_id)
      ) or is_admin()
    )
  );

-- ------------------------------------------------------------
-- audit_log: insert from triggers (security definer); admin reads
-- ------------------------------------------------------------
alter table audit_log enable row level security;

create policy "audit_log: admin reads" on audit_log
  for select using (is_admin());

create policy "audit_log: any authenticated insert" on audit_log
  for insert with check (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- notifications
-- ------------------------------------------------------------
alter table notifications enable row level security;

create policy "notifications: read own" on notifications
  for select using (user_id = auth.uid());

create policy "notifications: update own" on notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "notifications: admin all" on notifications
  for all using (is_admin()) with check (is_admin());

create policy "notifications: any authenticated insert" on notifications
  for insert with check (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- unlock_requests
-- ------------------------------------------------------------
alter table unlock_requests enable row level security;

create policy "unlock_requests: read parties" on unlock_requests
  for select using (
    requested_by = auth.uid()
    or is_admin()
    or exists (
      select 1 from goal_sheets gs
      where gs.id = unlock_requests.goal_sheet_id
        and (gs.employee_id = auth.uid() or is_manager_of(gs.employee_id))
    )
  );

create policy "unlock_requests: any authenticated insert" on unlock_requests
  for insert with check (requested_by = auth.uid());

create policy "unlock_requests: admin all" on unlock_requests
  for all using (is_admin()) with check (is_admin());
