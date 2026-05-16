-- ============================================================
-- Helper views and SQL functions used by the app
-- ============================================================

-- Active cycle (single row, current phase, dates)
create or replace view active_cycle as
  select * from cycles where is_active = true limit 1;

-- Current quarter from active cycle phase
create or replace function public.current_cycle_phase()
returns cycle_phase
language sql stable
as $$
  select current_phase from cycles where is_active = true limit 1;
$$;

create or replace function public.current_quarter()
returns text
language sql stable
as $$
  select case current_phase
    when 'q1' then 'q1'
    when 'q2' then 'q2'
    when 'q3' then 'q3'
    when 'q4_annual' then 'q4'
    else null
  end
  from cycles where is_active = true limit 1;
$$;

-- Goal with all 4 quarter actuals as columns (used by reports + analytics)
create or replace view goal_with_quarter_actuals as
select
  g.id as goal_id,
  g.goal_sheet_id,
  g.title,
  g.thrust_area_id,
  ta.name as thrust_area_name,
  g.uom_type,
  g.target,
  g.target_date,
  g.weightage,
  q1.actual_value as q1_actual_value,
  q1.actual_date as q1_actual_date,
  q1.status as q1_status,
  q2.actual_value as q2_actual_value,
  q2.actual_date as q2_actual_date,
  q2.status as q2_status,
  q3.actual_value as q3_actual_value,
  q3.actual_date as q3_actual_date,
  q3.status as q3_status,
  q4.actual_value as q4_actual_value,
  q4.actual_date as q4_actual_date,
  q4.status as q4_status
from goals g
left join thrust_areas ta on ta.id = g.thrust_area_id
left join achievements q1 on q1.goal_id = g.id and q1.quarter = 'q1'
left join achievements q2 on q2.goal_id = g.id and q2.quarter = 'q2'
left join achievements q3 on q3.goal_id = g.id and q3.quarter = 'q3'
left join achievements q4 on q4.goal_id = g.id and q4.quarter = 'q4';

-- Centralized SQL scoring for reports (mirrors lib/scoring/computeScore.ts)
create or replace function public.compute_score(
  p_uom uom_type,
  p_target numeric,
  p_target_date date,
  p_actual numeric,
  p_actual_date date
)
returns numeric
language plpgsql immutable as $$
begin
  if p_uom = 'zero' then
    if p_actual is null then return null; end if;
    return case when p_actual = 0 then 100 else 0 end;
  end if;

  if p_uom = 'timeline' then
    if p_actual_date is null or p_target_date is null then return null; end if;
    return case when p_actual_date <= p_target_date then 100 else 0 end;
  end if;

  if p_actual is null or p_target is null then return null; end if;

  if p_uom in ('numeric_min', 'percent_min') then
    if p_target = 0 then return 100; end if;
    return least((p_actual / p_target) * 100, 100);
  end if;

  if p_uom in ('numeric_max', 'percent_max') then
    if p_actual = 0 then return null; end if;
    return least((p_target / p_actual) * 100, 100);
  end if;

  return null;
end;
$$;

-- Sheet weighted score (sum of weightage * score / 100 for a quarter)
create or replace function public.sheet_quarter_score(
  p_sheet_id uuid,
  p_quarter text
)
returns numeric
language sql stable as $$
  select coalesce(sum(g.weightage * public.compute_score(
    g.uom_type, g.target, g.target_date, a.actual_value, a.actual_date
  ) / 100.0), 0)
  from goals g
  left join achievements a on a.goal_id = g.id and a.quarter = p_quarter
  where g.goal_sheet_id = p_sheet_id;
$$;

grant execute on function public.compute_score(uom_type, numeric, date, numeric, date) to authenticated, anon;
grant execute on function public.sheet_quarter_score(uuid, text) to authenticated;
grant execute on function public.current_cycle_phase() to authenticated, anon;
grant execute on function public.current_quarter() to authenticated, anon;
