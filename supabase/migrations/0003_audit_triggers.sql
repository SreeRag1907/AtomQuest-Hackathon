-- ============================================================
-- Audit triggers: every INSERT/UPDATE/DELETE on watched tables
-- writes a row to audit_log with before/after JSON.
-- Centralized at DB level so application code can never forget.
-- ============================================================

create or replace function public.audit_trigger_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_before jsonb;
  v_after jsonb;
  v_id uuid;
begin
  if (TG_OP = 'INSERT') then
    v_action := 'created';
    v_before := null;
    v_after := to_jsonb(new);
    v_id := new.id;
  elsif (TG_OP = 'UPDATE') then
    v_action := 'updated';
    v_before := to_jsonb(old);
    v_after := to_jsonb(new);
    v_id := new.id;
    -- Only goal_sheets has status; use TG_TABLE_NAME + jsonb so goals/achievements never touch old.status
    if TG_TABLE_NAME = 'goal_sheets' then
      if (to_jsonb(old) ->> 'status') is distinct from (to_jsonb(new) ->> 'status') then
        v_action := 'status_' || (new).status::text;
      end if;
    end if;
  elsif (TG_OP = 'DELETE') then
    v_action := 'deleted';
    v_before := to_jsonb(old);
    v_after := null;
    v_id := old.id;
  end if;

  insert into audit_log (entity_type, entity_id, action, changed_by, before_value, after_value)
  values (TG_TABLE_NAME, v_id, v_action, auth.uid(), v_before, v_after);

  return coalesce(new, old);
end;
$$;

drop trigger if exists audit_goal_sheets on goal_sheets;
create trigger audit_goal_sheets
  after insert or update or delete on goal_sheets
  for each row execute function public.audit_trigger_fn();

drop trigger if exists audit_goals on goals;
create trigger audit_goals
  after insert or update or delete on goals
  for each row execute function public.audit_trigger_fn();

drop trigger if exists audit_achievements on achievements;
create trigger audit_achievements
  after insert or update or delete on achievements
  for each row execute function public.audit_trigger_fn();

-- ------------------------------------------------------------
-- handle_new_user: auto-create profile on auth signup
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
begin
  v_full_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );
  v_role := coalesce(
    (new.raw_user_meta_data->>'role')::user_role,
    'employee'::user_role
  );
  v_department := new.raw_user_meta_data->>'department';
  if (new.raw_user_meta_data ? 'manager_id') then
    v_manager_id := (new.raw_user_meta_data->>'manager_id')::uuid;
  end if;

  insert into public.profiles (id, email, full_name, role, department, manager_id)
  values (new.id, new.email, v_full_name, v_role, v_department, v_manager_id)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
