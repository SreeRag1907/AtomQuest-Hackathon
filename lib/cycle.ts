import type { Cycle, CyclePhase, Quarter } from "@/types/database";

const QUARTER_FROM_PHASE: Partial<Record<CyclePhase, Quarter>> = {
  q1: "q1",
  q2: "q2",
  q3: "q3",
  q4_annual: "q4",
};

const PHASE_LABEL: Record<CyclePhase, string> = {
  not_started: "Not started",
  goal_setting: "Goal setting",
  q1: "Q1 check-in",
  q2: "Q2 check-in",
  q3: "Q3 check-in",
  q4_annual: "Q4 / annual review",
  closed: "Closed",
};

export function quarterFromPhase(phase: CyclePhase): Quarter | null {
  return QUARTER_FROM_PHASE[phase] ?? null;
}

export function phaseLabel(phase: CyclePhase): string {
  return PHASE_LABEL[phase];
}

/** Get current window close date for the active phase. */
export function phaseCloseDate(cycle: Cycle): string | null {
  switch (cycle.current_phase) {
    case "goal_setting":
      return cycle.goal_setting_closes;
    case "q1":
      return cycle.q1_closes;
    case "q2":
      return cycle.q2_closes;
    case "q3":
      return cycle.q3_closes;
    case "q4_annual":
      return cycle.q4_closes;
    default:
      return null;
  }
}

/** Days until a date (positive = future, negative = past). */
export function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

export function isCheckinPhase(phase: CyclePhase): boolean {
  return phase === "q1" || phase === "q2" || phase === "q3" || phase === "q4_annual";
}

export function isGoalSettingPhase(phase: CyclePhase): boolean {
  return phase === "goal_setting";
}

/** True only when the phase is goal_setting AND the window hasn't closed yet. */
export function isGoalSettingWindowOpen(cycle: Cycle): boolean {
  if (cycle.current_phase !== "goal_setting") return false;
  const days = daysUntil(cycle.goal_setting_closes);
  return days === null || days >= 0;
}
