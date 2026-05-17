-- Allow managers to create goal sheets for direct reports and to add/remove
-- draft goals while assigning (replaces client-only employee flow).

create policy "goal_sheets: manager insert reports" on goal_sheets
  for insert with check (is_manager_of(employee_id));

create policy "goals: manager inserts reports' goals draft" on goals
  for insert with check (
    exists (
      select 1 from goal_sheets gs
      where gs.id = goals.goal_sheet_id
        and is_manager_of(gs.employee_id)
        and gs.status in ('draft', 'returned')
    )
  );

create policy "goals: manager deletes reports' goals draft" on goals
  for delete using (
    exists (
      select 1 from goal_sheets gs
      where gs.id = goals.goal_sheet_id
        and is_manager_of(gs.employee_id)
        and gs.status in ('draft', 'returned')
    )
  );
