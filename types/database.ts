// Hand-written types mirroring supabase/migrations/0001_enums_tables.sql.
// Keep in sync; could be generated via `supabase gen types typescript`.

export type UserRole = "employee" | "manager" | "admin";
export type UomType =
  | "numeric_min"
  | "numeric_max"
  | "percent_min"
  | "percent_max"
  | "timeline"
  | "zero";
export type GoalStatus = "draft" | "submitted" | "approved" | "locked" | "returned";
export type CyclePhase =
  | "not_started"
  | "goal_setting"
  | "q1"
  | "q2"
  | "q3"
  | "q4_annual"
  | "closed";
export type AchievementStatus = "not_started" | "on_track" | "completed";
export type Quarter = "q1" | "q2" | "q3" | "q4";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  manager_id: string | null;
  department: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Cycle {
  id: string;
  name: string;
  current_phase: CyclePhase;
  goal_setting_opens: string | null;
  goal_setting_closes: string | null;
  q1_opens: string | null;
  q1_closes: string | null;
  q2_opens: string | null;
  q2_closes: string | null;
  q3_opens: string | null;
  q3_closes: string | null;
  q4_opens: string | null;
  q4_closes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ThrustArea {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface GoalSheet {
  id: string;
  employee_id: string;
  cycle_id: string;
  status: GoalStatus;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  locked_at: string | null;
  return_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  goal_sheet_id: string;
  thrust_area_id: string | null;
  title: string;
  description: string | null;
  uom_type: UomType;
  target: number | null;
  target_date: string | null;
  // Drafts may persist `null` (post-migration 0010). Submission enforces 10..100
  // via Zod and the submit path.
  weightage: number | null;
  is_shared: boolean;
  parent_goal_id: string | null;
  display_order: number;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  goal_id: string;
  quarter: Quarter;
  actual_value: number | null;
  actual_date: string | null;
  status: AchievementStatus;
  updated_at: string;
  updated_by: string | null;
}

export interface CheckinComment {
  id: string;
  goal_sheet_id: string;
  quarter: Quarter;
  manager_id: string;
  comment: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRow {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changed_by: string | null;
  before_value: Record<string, unknown> | null;
  after_value: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface UnlockRequest {
  id: string;
  goal_sheet_id: string;
  requested_by: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export type EscalationTriggerEvent =
  | "goals_not_submitted"
  | "goals_not_approved"
  | "checkin_not_done";

export interface EscalationRule {
  id: string;
  name: string;
  trigger_event: EscalationTriggerEvent;
  threshold_days: number;
  notify_employee: boolean;
  notify_manager: boolean;
  notify_hr: boolean;
  is_active: boolean;
  created_at: string;
  created_by: string | null;
  updated_at: string;
}

export interface EscalationLogRow {
  id: string;
  rule_id: string | null;
  employee_id: string;
  trigger_event: EscalationTriggerEvent;
  fired_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  notes: string | null;
}
