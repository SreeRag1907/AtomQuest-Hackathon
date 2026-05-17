-- Fix audit_trigger_fn: shared trigger on goal_sheets, goals, achievements
-- must not reference old.status unless the row is actually goal_sheets.
-- (Otherwise UPDATE on goals errors: record "old" has no field "status".)

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
    -- Only goal_sheets has status; compare via jsonb so other tables never touch .status
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
