-- ============================================================
-- AtomQuest Portal — Demo Seed
-- 1 admin, 3 managers, 12 employees across 3 departments,
-- 1 active cycle in q2, mixed goal-sheet states.
-- All passwords: "Atomquest!2026"
-- ============================================================

-- Disable audit triggers during seed so we don't get noise
alter table goal_sheets disable trigger audit_goal_sheets;
alter table goals disable trigger audit_goals;
alter table achievements disable trigger audit_achievements;

-- ---- Auth users (passwords hashed with bcrypt via crypt()) ---
-- Note: handle_new_user trigger auto-creates the profile row.

do $$
declare
  pwd text := crypt('Atomquest!2026', gen_salt('bf'));
begin
  -- Admin
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  values
    ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'admin@atomquest.demo', pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ada Adminson","role":"admin","department":"Operations"}', now(), now(), '', '', '', '');

  -- Managers
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  values
    ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222221', 'authenticated', 'authenticated', 'maya.patel@atomquest.demo', pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Maya Patel","role":"manager","department":"Engineering"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'rohan.verma@atomquest.demo', pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Rohan Verma","role":"manager","department":"Sales"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222223', 'authenticated', 'authenticated', 'sara.chen@atomquest.demo', pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Sara Chen","role":"manager","department":"Customer Success"}', now(), now(), '', '', '', '');

  -- Engineering employees (4)
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  values
    ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333301', 'authenticated', 'authenticated', 'priya.iyer@atomquest.demo', pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Priya Iyer","role":"employee","department":"Engineering"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333302', 'authenticated', 'authenticated', 'arjun.rao@atomquest.demo', pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Arjun Rao","role":"employee","department":"Engineering"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333303', 'authenticated', 'authenticated', 'leena.kapoor@atomquest.demo', pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Leena Kapoor","role":"employee","department":"Engineering"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333304', 'authenticated', 'authenticated', 'devika.shah@atomquest.demo', pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Devika Shah","role":"employee","department":"Engineering"}', now(), now(), '', '', '', '');

  -- Sales employees (4)
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  values
    ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333305', 'authenticated', 'authenticated', 'kiran.menon@atomquest.demo', pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Kiran Menon","role":"employee","department":"Sales"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333306', 'authenticated', 'authenticated', 'noah.singh@atomquest.demo', pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Noah Singh","role":"employee","department":"Sales"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333307', 'authenticated', 'authenticated', 'tanvi.deshpande@atomquest.demo', pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Tanvi Deshpande","role":"employee","department":"Sales"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333308', 'authenticated', 'authenticated', 'isha.bansal@atomquest.demo', pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Isha Bansal","role":"employee","department":"Sales"}', now(), now(), '', '', '', '');

  -- Customer Success employees (4)
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
  values
    ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333309', 'authenticated', 'authenticated', 'ravi.kulkarni@atomquest.demo', pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Ravi Kulkarni","role":"employee","department":"Customer Success"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333310', 'authenticated', 'authenticated', 'mira.suri@atomquest.demo', pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Mira Suri","role":"employee","department":"Customer Success"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333311', 'authenticated', 'authenticated', 'omar.khan@atomquest.demo', pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Omar Khan","role":"employee","department":"Customer Success"}', now(), now(), '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333312', 'authenticated', 'authenticated', 'jiya.kothari@atomquest.demo', pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Jiya Kothari","role":"employee","department":"Customer Success"}', now(), now(), '', '', '', '');
end $$;

-- Manager assignments
update profiles set manager_id = '22222222-2222-2222-2222-222222222221' where id::text like '33333333-3333-3333-3333-3333333333%' and department = 'Engineering';
update profiles set manager_id = '22222222-2222-2222-2222-222222222222' where id::text like '33333333-3333-3333-3333-3333333333%' and department = 'Sales';
update profiles set manager_id = '22222222-2222-2222-2222-222222222223' where id::text like '33333333-3333-3333-3333-3333333333%' and department = 'Customer Success';
update profiles set manager_id = '11111111-1111-1111-1111-111111111111' where role = 'manager';

-- ---- Cycle ----
insert into cycles (id, name, current_phase, goal_setting_opens, goal_setting_closes, q1_opens, q1_closes, q2_opens, q2_closes, q3_opens, q3_closes, q4_opens, q4_closes, is_active)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'FY2026', 'q2',
    '2026-03-15', '2026-04-10',
    '2026-04-01', '2026-07-15',
    '2026-07-01', '2026-10-15',
    '2026-10-01', '2027-01-15',
    '2027-01-01', '2027-04-15',
    true);

-- ---- Thrust Areas ----
insert into thrust_areas (id, name, description) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'Customer Excellence', 'Outcomes that improve customer satisfaction and retention'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'Operational Efficiency', 'Streamline internal processes and reduce waste'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', 'Revenue Growth', 'Top-line and cross-sell expansion'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', 'Innovation', 'New product, IP, and capability development'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb05', 'People & Culture', 'Hiring, learning, engagement, retention'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb06', 'Quality & Compliance', 'Defect rates, audit readiness, regulatory');

-- ---- Goal sheets ----
-- Use deterministic IDs so we can reference them when inserting goals.

-- Locked + approved (3): Priya, Kiran, Ravi
insert into goal_sheets (id, employee_id, cycle_id, status, submitted_at, approved_at, approved_by, locked_at)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccc01', '33333333-3333-3333-3333-333333333301', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'locked', now() - interval '70 days', now() - interval '60 days', '22222222-2222-2222-2222-222222222221', now() - interval '60 days'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc02', '33333333-3333-3333-3333-333333333305', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'locked', now() - interval '68 days', now() - interval '58 days', '22222222-2222-2222-2222-222222222222', now() - interval '58 days'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc03', '33333333-3333-3333-3333-333333333309', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'locked', now() - interval '65 days', now() - interval '55 days', '22222222-2222-2222-2222-222222222223', now() - interval '55 days');

-- Submitted (2): Arjun, Noah
insert into goal_sheets (id, employee_id, cycle_id, status, submitted_at)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccc04', '33333333-3333-3333-3333-333333333302', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'submitted', now() - interval '3 days'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc05', '33333333-3333-3333-3333-333333333306', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'submitted', now() - interval '1 days');

-- Draft (2): Leena, Tanvi
insert into goal_sheets (id, employee_id, cycle_id, status)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccc06', '33333333-3333-3333-3333-333333333303', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'draft'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc07', '33333333-3333-3333-3333-333333333307', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'draft');

-- Approved-only (not locked): Mira  — used to demo unlock flow
insert into goal_sheets (id, employee_id, cycle_id, status, submitted_at, approved_at, approved_by, locked_at)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccc08', '33333333-3333-3333-3333-333333333310', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'approved', now() - interval '50 days', now() - interval '40 days', '22222222-2222-2222-2222-222222222223', null);

-- Returned (1): Devika  — manager bounced it back
insert into goal_sheets (id, employee_id, cycle_id, status, submitted_at, return_reason)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccc09', '33333333-3333-3333-3333-333333333304', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'returned', now() - interval '5 days', 'Goal #2 weightage seems too low for the impact described. Please reconsider weighting and add measurable target.');

-- ---- Goals (locked sheets get full 5-goal sets totaling 100%) ----

-- Priya (Engineering) — locked
insert into goals (id, goal_sheet_id, thrust_area_id, title, description, uom_type, target, weightage, display_order)
values
  ('dddddddd-dddd-dddd-dddd-ddddddddd001', 'cccccccc-cccc-cccc-cccc-cccccccccc01', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'Reduce P0 incident MTTR', 'Drive median MTTR for production P0 incidents below threshold.', 'numeric_max', 30, 25, 1),
  ('dddddddd-dddd-dddd-dddd-ddddddddd002', 'cccccccc-cccc-cccc-cccc-cccccccccc01', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', 'Ship 3 new platform features', 'Lead delivery of three roadmap items end to end.', 'numeric_min', 3, 25, 2),
  ('dddddddd-dddd-dddd-dddd-ddddddddd003', 'cccccccc-cccc-cccc-cccc-cccccccccc01', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb06', 'Maintain >95% test coverage', 'Coverage on critical packages.', 'percent_min', 95, 20, 3),
  ('dddddddd-dddd-dddd-dddd-ddddddddd004', 'cccccccc-cccc-cccc-cccc-cccccccccc01', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb05', 'Mentor 2 junior engineers', 'Weekly 1:1, growth plan, peer reviews.', 'numeric_min', 2, 15, 4),
  ('dddddddd-dddd-dddd-dddd-ddddddddd005', 'cccccccc-cccc-cccc-cccc-cccccccccc01', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb06', 'Zero critical security findings', 'No P0/P1 from security review.', 'zero', 0, 15, 5);

-- Kiran (Sales) — locked
insert into goals (id, goal_sheet_id, thrust_area_id, title, description, uom_type, target, target_date, weightage, display_order)
values
  ('dddddddd-dddd-dddd-dddd-ddddddddd006', 'cccccccc-cccc-cccc-cccc-cccccccccc02', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', 'Achieve $1.2M new ARR', 'Net-new logo ARR for the year.', 'numeric_min', 1200000, null, 35, 1),
  ('dddddddd-dddd-dddd-dddd-ddddddddd007', 'cccccccc-cccc-cccc-cccc-cccccccccc02', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'NPS >= 60 across portfolio', 'Quarterly NPS scoring.', 'numeric_min', 60, null, 20, 2),
  ('dddddddd-dddd-dddd-dddd-ddddddddd008', 'cccccccc-cccc-cccc-cccc-cccccccccc02', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', 'Pipeline coverage 3.5x', 'Maintain healthy quarterly coverage.', 'percent_min', 350, null, 20, 3),
  ('dddddddd-dddd-dddd-dddd-ddddddddd009', 'cccccccc-cccc-cccc-cccc-cccccccccc02', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', 'Launch enterprise tier by Sep 30', 'Coordinated GTM kickoff.', 'timeline', null, '2026-09-30', 15, 4),
  ('dddddddd-dddd-dddd-dddd-ddddddddd010', 'cccccccc-cccc-cccc-cccc-cccccccccc02', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb05', 'Hire 2 enterprise AEs', 'Backfill territory.', 'numeric_min', 2, null, 10, 5);

-- Ravi (Customer Success) — locked
insert into goals (id, goal_sheet_id, thrust_area_id, title, description, uom_type, target, weightage, display_order)
values
  ('dddddddd-dddd-dddd-dddd-ddddddddd011', 'cccccccc-cccc-cccc-cccc-cccccccccc03', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'GRR >= 95%', 'Gross retention rate.', 'percent_min', 95, 30, 1),
  ('dddddddd-dddd-dddd-dddd-ddddddddd012', 'cccccccc-cccc-cccc-cccc-cccccccccc03', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', 'Drive $300K expansion ARR', 'Cross-sell + upsell.', 'numeric_min', 300000, 25, 2),
  ('dddddddd-dddd-dddd-dddd-ddddddddd013', 'cccccccc-cccc-cccc-cccc-cccccccccc03', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'Reduce avg ticket time to <8h', 'Mean first response.', 'numeric_max', 8, 20, 3),
  ('dddddddd-dddd-dddd-dddd-ddddddddd014', 'cccccccc-cccc-cccc-cccc-cccccccccc03', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'Run 8 customer business reviews', 'Strategic QBRs with top accounts.', 'numeric_min', 8, 15, 4),
  ('dddddddd-dddd-dddd-dddd-ddddddddd015', 'cccccccc-cccc-cccc-cccc-cccccccccc03', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb05', 'Complete advanced CSM training', 'Internal certification track.', 'percent_min', 100, 10, 5);

-- Arjun (Engineering) — submitted, awaiting Maya's review
insert into goals (id, goal_sheet_id, thrust_area_id, title, description, uom_type, target, weightage, display_order)
values
  ('dddddddd-dddd-dddd-dddd-ddddddddd016', 'cccccccc-cccc-cccc-cccc-cccccccccc04', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', 'Migrate billing service to v2', 'Zero downtime cutover.', 'percent_min', 100, 30, 1),
  ('dddddddd-dddd-dddd-dddd-ddddddddd017', 'cccccccc-cccc-cccc-cccc-cccccccccc04', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'Reduce CI build time to <8 min', 'Faster developer feedback.', 'numeric_max', 8, 20, 2),
  ('dddddddd-dddd-dddd-dddd-ddddddddd018', 'cccccccc-cccc-cccc-cccc-cccccccccc04', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', 'Lead 2 architecture reviews', 'Cross-team design forums.', 'numeric_min', 2, 20, 3),
  ('dddddddd-dddd-dddd-dddd-ddddddddd019', 'cccccccc-cccc-cccc-cccc-cccccccccc04', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb06', 'Reduce open vulnerabilities', 'Drive count to zero on owned services.', 'zero', 0, 15, 4),
  ('dddddddd-dddd-dddd-dddd-ddddddddd020', 'cccccccc-cccc-cccc-cccc-cccccccccc04', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb05', 'Run weekly tech talks', 'Knowledge sharing program.', 'numeric_min', 12, 15, 5);

-- Noah (Sales) — submitted
insert into goals (id, goal_sheet_id, thrust_area_id, title, description, uom_type, target, weightage, display_order)
values
  ('dddddddd-dddd-dddd-dddd-ddddddddd021', 'cccccccc-cccc-cccc-cccc-cccccccccc05', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', 'New ARR $900K', 'Quota.', 'numeric_min', 900000, 40, 1),
  ('dddddddd-dddd-dddd-dddd-ddddddddd022', 'cccccccc-cccc-cccc-cccc-cccccccccc05', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', '40 qualified opportunities', 'Top of funnel discipline.', 'numeric_min', 40, 25, 2),
  ('dddddddd-dddd-dddd-dddd-ddddddddd023', 'cccccccc-cccc-cccc-cccc-cccccccccc05', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'Win rate >= 25%', 'Improve qualification.', 'percent_min', 25, 20, 3),
  ('dddddddd-dddd-dddd-dddd-ddddddddd024', 'cccccccc-cccc-cccc-cccc-cccccccccc05', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', 'Run 4 partner co-sells', 'Joint motion with partners.', 'numeric_min', 4, 15, 4);

-- Leena (Engineering) — draft, partial
insert into goals (id, goal_sheet_id, thrust_area_id, title, uom_type, target, weightage, display_order)
values
  ('dddddddd-dddd-dddd-dddd-ddddddddd025', 'cccccccc-cccc-cccc-cccc-cccccccccc06', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', 'Launch new mobile app v2', 'numeric_min', 1, 35, 1),
  ('dddddddd-dddd-dddd-dddd-ddddddddd026', 'cccccccc-cccc-cccc-cccc-cccccccccc06', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'Cut crash-free sessions misses', 'percent_min', 99, 25, 2);

-- Tanvi (Sales) — draft, single goal
insert into goals (id, goal_sheet_id, thrust_area_id, title, uom_type, target, weightage, display_order)
values
  ('dddddddd-dddd-dddd-dddd-ddddddddd027', 'cccccccc-cccc-cccc-cccc-cccccccccc07', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb03', 'New ARR target', 'numeric_min', 750000, 40, 1);

-- Mira (Customer Success) — approved (not locked yet)
insert into goals (id, goal_sheet_id, thrust_area_id, title, description, uom_type, target, weightage, display_order)
values
  ('dddddddd-dddd-dddd-dddd-ddddddddd028', 'cccccccc-cccc-cccc-cccc-cccccccccc08', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'CSAT >= 4.5', 'Quarterly customer feedback.', 'numeric_min', 4.5, 30, 1),
  ('dddddddd-dddd-dddd-dddd-ddddddddd029', 'cccccccc-cccc-cccc-cccc-cccccccccc08', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', 'Onboard 20 new accounts', 'Time to first value < 30 days.', 'numeric_min', 20, 25, 2),
  ('dddddddd-dddd-dddd-dddd-ddddddddd030', 'cccccccc-cccc-cccc-cccc-cccccccccc08', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'Deflect 30% of L1 tickets', 'Self-service content + bots.', 'percent_min', 30, 25, 3),
  ('dddddddd-dddd-dddd-dddd-ddddddddd031', 'cccccccc-cccc-cccc-cccc-cccccccccc08', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb05', 'Complete CCSM cert', 'Career milestone.', 'percent_min', 100, 20, 4);

-- Devika (Engineering) — returned, with low-weightage goal #2
insert into goals (id, goal_sheet_id, thrust_area_id, title, description, uom_type, target, weightage, display_order)
values
  ('dddddddd-dddd-dddd-dddd-ddddddddd032', 'cccccccc-cccc-cccc-cccc-cccccccccc09', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb02', 'Improve deploy frequency to weekly', 'Cadence target.', 'numeric_min', 52, 35, 1),
  ('dddddddd-dddd-dddd-dddd-ddddddddd033', 'cccccccc-cccc-cccc-cccc-cccccccccc09', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb04', 'Open-source contribution', 'Light commitment for now.', 'numeric_min', 1, 10, 2),
  ('dddddddd-dddd-dddd-dddd-ddddddddd034', 'cccccccc-cccc-cccc-cccc-cccccccccc09', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb05', 'Mentor 1 intern', null, 'numeric_min', 1, 30, 3),
  ('dddddddd-dddd-dddd-dddd-ddddddddd035', 'cccccccc-cccc-cccc-cccc-cccccccccc09', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb06', 'Audit infra for compliance', null, 'percent_min', 100, 25, 4);

-- ---- Q1 achievements (only for the 3 locked sheets + Mira approved) ----
-- Priya
insert into achievements (goal_id, quarter, actual_value, status, updated_by) values
  ('dddddddd-dddd-dddd-dddd-ddddddddd001', 'q1', 38, 'on_track', '33333333-3333-3333-3333-333333333301'),
  ('dddddddd-dddd-dddd-dddd-ddddddddd002', 'q1', 1, 'on_track', '33333333-3333-3333-3333-333333333301'),
  ('dddddddd-dddd-dddd-dddd-ddddddddd003', 'q1', 96, 'completed', '33333333-3333-3333-3333-333333333301'),
  ('dddddddd-dddd-dddd-dddd-ddddddddd004', 'q1', 2, 'on_track', '33333333-3333-3333-3333-333333333301'),
  ('dddddddd-dddd-dddd-dddd-ddddddddd005', 'q1', 0, 'completed', '33333333-3333-3333-3333-333333333301');

-- Kiran
insert into achievements (goal_id, quarter, actual_value, actual_date, status, updated_by) values
  ('dddddddd-dddd-dddd-dddd-ddddddddd006', 'q1', 280000, null, 'on_track', '33333333-3333-3333-3333-333333333305'),
  ('dddddddd-dddd-dddd-dddd-ddddddddd007', 'q1', 58, null, 'on_track', '33333333-3333-3333-3333-333333333305'),
  ('dddddddd-dddd-dddd-dddd-ddddddddd008', 'q1', 320, null, 'on_track', '33333333-3333-3333-3333-333333333305'),
  ('dddddddd-dddd-dddd-dddd-ddddddddd009', 'q1', null, null, 'not_started', '33333333-3333-3333-3333-333333333305'),
  ('dddddddd-dddd-dddd-dddd-ddddddddd010', 'q1', 0, null, 'not_started', '33333333-3333-3333-3333-333333333305');

-- Ravi
insert into achievements (goal_id, quarter, actual_value, status, updated_by) values
  ('dddddddd-dddd-dddd-dddd-ddddddddd011', 'q1', 96, 'on_track', '33333333-3333-3333-3333-333333333309'),
  ('dddddddd-dddd-dddd-dddd-ddddddddd012', 'q1', 65000, 'on_track', '33333333-3333-3333-3333-333333333309'),
  ('dddddddd-dddd-dddd-dddd-ddddddddd013', 'q1', 9.4, 'on_track', '33333333-3333-3333-3333-333333333309'),
  ('dddddddd-dddd-dddd-dddd-ddddddddd014', 'q1', 2, 'on_track', '33333333-3333-3333-3333-333333333309'),
  ('dddddddd-dddd-dddd-dddd-ddddddddd015', 'q1', 25, 'on_track', '33333333-3333-3333-3333-333333333309');

-- ---- Sample manager check-in comment for Q1 ----
insert into checkin_comments (goal_sheet_id, quarter, manager_id, comment) values
  ('cccccccc-cccc-cccc-cccc-cccccccccc01', 'q1', '22222222-2222-2222-2222-222222222221', 'Strong Q1 — incident MTTR is trending down. Keep the focus on coverage as you ramp the new features.'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc02', 'q1', '22222222-2222-2222-2222-222222222222', 'Pipeline coverage looks healthy. Need to firm up the enterprise launch milestone before Q2 close.');

-- ---- Sample notifications ----
insert into notifications (user_id, type, title, message, link, is_read) values
  ('22222222-2222-2222-2222-222222222221', 'goal_submitted', 'Arjun Rao submitted goals', 'Awaiting your review', '/team/approvals', false),
  ('22222222-2222-2222-2222-222222222222', 'goal_submitted', 'Noah Singh submitted goals', 'Awaiting your review', '/team/approvals', false),
  ('33333333-3333-3333-3333-333333333304', 'goal_returned', 'Goals returned for rework', 'Maya left a comment on your sheet', '/goals', false),
  ('33333333-3333-3333-3333-333333333301', 'cycle_phase', 'Q2 check-in window is open', 'Update your achievements by Oct 15', '/check-ins', true),
  ('11111111-1111-1111-1111-111111111111', 'system', 'Welcome to AtomQuest', 'Demo environment seeded successfully', '/dashboard', true);

-- ---- Sample audit log entries (the triggers will add more on writes; these are illustrative) ----
insert into audit_log (entity_type, entity_id, action, changed_by, before_value, after_value, reason, created_at) values
  ('goal_sheets', 'cccccccc-cccc-cccc-cccc-cccccccccc01', 'status_locked', '22222222-2222-2222-2222-222222222221',
   '{"status":"submitted"}'::jsonb,
   '{"status":"locked"}'::jsonb,
   'Approved during Q1 cycle close', now() - interval '60 days'),
  ('goal_sheets', 'cccccccc-cccc-cccc-cccc-cccccccccc09', 'status_returned', '22222222-2222-2222-2222-222222222221',
   '{"status":"submitted"}'::jsonb,
   '{"status":"returned"}'::jsonb,
   'Goal #2 weightage too low', now() - interval '5 days');

-- Re-enable audit triggers
alter table goal_sheets enable trigger audit_goal_sheets;
alter table goals enable trigger audit_goals;
alter table achievements enable trigger audit_achievements;
