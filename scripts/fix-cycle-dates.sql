-- Run this in your Supabase SQL editor (https://supabase.com → project → SQL Editor)
-- Sets the active cycle to Q2 check-in phase with dates aligned to the problem spec.
--
--  Goal setting  : 01 May 2026 – 31 May 2026  (now past → correct)
--  Q1 check-in   : 01 Jun 2026 – 15 Jul 2026  (past)
--  Q2 check-in   : 16 Jul 2026 – 15 Oct 2026  ← currently open (May 17 2026 is inside window)
--  Q3 check-in   : 16 Oct 2026 – 15 Jan 2027
--  Q4 / annual   : 16 Jan 2027 – 15 Apr 2027

UPDATE cycles
SET
  current_phase        = 'q2',
  goal_setting_opens   = '2026-05-01',
  goal_setting_closes  = '2026-05-31',
  q1_opens             = '2026-06-01',
  q1_closes            = '2026-07-15',
  q2_opens             = '2026-07-16',
  q2_closes            = '2026-10-15',
  q3_opens             = '2026-10-16',
  q3_closes            = '2027-01-15',
  q4_opens             = '2027-01-16',
  q4_closes            = '2027-04-15'
WHERE is_active = true;
