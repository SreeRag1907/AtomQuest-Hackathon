-- 0005_shared_goals.sql
-- Shared goals: a "parent" goal owned by a manager/admin can be pushed to multiple
-- recipients. Each recipient gets a child row (parent_goal_id NOT NULL) on their own
-- goal sheet. Achievements entered on the parent automatically mirror into all
-- children so the org-wide KPI stays consistent. Recipients can only adjust the
-- weightage of a child goal — title/target/uom are read-only.

-- 1. Trigger: when an achievement on a parent goal is upserted, mirror it to
-- the matching quarter on every linked child goal. We use a SECURITY DEFINER
-- function so the trigger can write rows the calling user might not have RLS
-- access to (e.g., an admin updating their own goal mirrors into employees).
create or replace function public.sync_shared_achievement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_goal goals%rowtype;
begin
  select * into v_parent_goal from public.goals where id = NEW.goal_id;
  if v_parent_goal is null then
    return NEW;
  end if;

  -- Only the parent's achievement triggers fan-out. If this row IS a child
  -- (parent_goal_id is not null) we do nothing — children are written to
  -- only by this function.
  if v_parent_goal.parent_goal_id is not null then
    return NEW;
  end if;

  -- For every child goal, upsert a matching achievement row.
  insert into public.achievements (goal_id, quarter, actual_value, actual_date, status, updated_by)
  select
    g.id,
    NEW.quarter,
    NEW.actual_value,
    NEW.actual_date,
    NEW.status,
    NEW.updated_by
  from public.goals g
  where g.parent_goal_id = v_parent_goal.id
  on conflict (goal_id, quarter) do update
    set
      actual_value = excluded.actual_value,
      actual_date = excluded.actual_date,
      status = excluded.status,
      updated_by = excluded.updated_by,
      updated_at = now();

  return NEW;
end;
$$;

drop trigger if exists trg_sync_shared_achievement on public.achievements;
create trigger trg_sync_shared_achievement
after insert or update on public.achievements
for each row execute function public.sync_shared_achievement();

-- 2. Trigger: prevent direct writes to child achievements (they must come from
-- the sync trigger above, which runs as security definer and is allowed via
-- the "session_replication_role = origin" guard pattern).
-- We detect "external" calls by checking pg_trigger_depth(): when the row
-- arrives via the sync trigger above, depth > 0 because the parent insert
-- fires the sync function, which then performs an INSERT that fires this
-- check trigger at depth 1.
create or replace function public.prevent_child_achievement_write()
returns trigger
language plpgsql
as $$
declare
  v_parent_id uuid;
begin
  select parent_goal_id into v_parent_id from public.goals where id = NEW.goal_id;
  if v_parent_id is null then
    return NEW; -- not a child goal, allow
  end if;

  if pg_trigger_depth() > 1 then
    return NEW; -- coming from sync trigger
  end if;

  raise exception 'Achievements on a shared (child) goal are auto-synced from the primary owner. Direct edits are not allowed.';
end;
$$;

drop trigger if exists trg_prevent_child_achievement_write on public.achievements;
create trigger trg_prevent_child_achievement_write
before insert or update on public.achievements
for each row execute function public.prevent_child_achievement_write();

-- 3. Constraint: if a goal has parent_goal_id set, its uom/target/title cannot
-- diverge. Enforce by trigger so attempts from app to "edit" the title/target
-- of a child goal are rejected. Weightage and display_order remain editable.
create or replace function public.enforce_child_goal_immutables()
returns trigger
language plpgsql
as $$
declare
  v_parent goals%rowtype;
begin
  if NEW.parent_goal_id is null then
    return NEW;
  end if;

  select * into v_parent from public.goals where id = NEW.parent_goal_id;
  if v_parent is null then
    return NEW; -- parent missing, treat as orphan; allow
  end if;

  -- Force-mirror immutable fields from parent so the app cannot accidentally
  -- diverge them. Weightage stays as the recipient set it.
  NEW.title := v_parent.title;
  NEW.description := v_parent.description;
  NEW.uom_type := v_parent.uom_type;
  NEW.target := v_parent.target;
  NEW.target_date := v_parent.target_date;
  NEW.thrust_area_id := v_parent.thrust_area_id;
  NEW.is_shared := true;

  return NEW;
end;
$$;

drop trigger if exists trg_enforce_child_goal_immutables on public.goals;
create trigger trg_enforce_child_goal_immutables
before insert or update on public.goals
for each row execute function public.enforce_child_goal_immutables();

-- 4. When the PARENT goal is updated, propagate immutable field changes to all
-- children automatically.
create or replace function public.propagate_parent_goal_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.parent_goal_id is not null then
    return NEW; -- only react to parents
  end if;

  if (TG_OP = 'UPDATE') and (
       NEW.title is distinct from OLD.title
    or NEW.description is distinct from OLD.description
    or NEW.uom_type is distinct from OLD.uom_type
    or NEW.target is distinct from OLD.target
    or NEW.target_date is distinct from OLD.target_date
    or NEW.thrust_area_id is distinct from OLD.thrust_area_id
  ) then
    update public.goals
       set title = NEW.title,
           description = NEW.description,
           uom_type = NEW.uom_type,
           target = NEW.target,
           target_date = NEW.target_date,
           thrust_area_id = NEW.thrust_area_id,
           updated_at = now()
     where parent_goal_id = NEW.id;
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_propagate_parent_goal_changes on public.goals;
create trigger trg_propagate_parent_goal_changes
after update on public.goals
for each row execute function public.propagate_parent_goal_changes();

-- 5. Helper view: shared goal recipients (used by admin/manager UI to show who
-- a parent goal is shared with).
create or replace view public.shared_goal_recipients as
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
