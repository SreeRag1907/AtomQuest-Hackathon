-- Allow employees and managers to read audit rows for their own / team goal sheets and goals.
-- Admins retain full read via existing policy.

create or replace function public.can_read_audit_entity(etype text, eid uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select case
    when etype = 'goal_sheets' then exists (
      select 1 from goal_sheets gs
      where gs.id = eid
        and (
          gs.employee_id = auth.uid()
          or public.is_manager_of(gs.employee_id)
        )
    )
    when etype = 'goals' then exists (
      select 1 from goals g
      join goal_sheets gs on gs.id = g.goal_sheet_id
      where g.id = eid
        and (
          gs.employee_id = auth.uid()
          or public.is_manager_of(gs.employee_id)
        )
    )
    when etype = 'achievements' then exists (
      select 1 from achievements a
      join goals g on g.id = a.goal_id
      join goal_sheets gs on gs.id = g.goal_sheet_id
      where a.id = eid
        and (
          gs.employee_id = auth.uid()
          or public.is_manager_of(gs.employee_id)
        )
    )
    else false
  end;
$$;

grant execute on function public.can_read_audit_entity(text, uuid) to authenticated;

create policy "audit_log: read own and team scope" on audit_log
  for select using (public.can_read_audit_entity(entity_type, entity_id));
