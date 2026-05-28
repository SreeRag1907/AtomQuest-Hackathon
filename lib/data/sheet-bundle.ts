import type { SupabaseClient } from "@supabase/supabase-js";
import type { Achievement, Goal, GoalSheet } from "@/types/database";

/** Goals + achievements for a cycle in three DB round-trips (sheets → goals → achievements). */
export async function fetchGoalSheetBundle(
  supabase: SupabaseClient,
  cycleId: string | null | undefined
): Promise<{ sheets: GoalSheet[]; goals: Goal[]; achievements: Achievement[] }> {
  if (!cycleId) {
    return { sheets: [], goals: [], achievements: [] };
  }

  const { data: sheets } = await supabase
    .from("goal_sheets")
    .select("*")
    .eq("cycle_id", cycleId);

  const sheetIds = (sheets ?? []).map((s) => s.id);
  if (sheetIds.length === 0) {
    return { sheets: (sheets ?? []) as GoalSheet[], goals: [], achievements: [] };
  }

  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .in("goal_sheet_id", sheetIds);

  const goalIds = (goals ?? []).map((g) => g.id);
  if (goalIds.length === 0) {
    return {
      sheets: (sheets ?? []) as GoalSheet[],
      goals: (goals ?? []) as Goal[],
      achievements: [],
    };
  }

  const { data: achievements } = await supabase
    .from("achievements")
    .select("*")
    .in("goal_id", goalIds);

  return {
    sheets: (sheets ?? []) as GoalSheet[],
    goals: (goals ?? []) as Goal[],
    achievements: (achievements ?? []) as Achievement[],
  };
}
