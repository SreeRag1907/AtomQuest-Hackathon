"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { quarterFromPhase } from "@/lib/cycle";
import type {
  AchievementStatus,
  Cycle,
  GoalSheet,
  Profile,
  Quarter,
} from "@/types/database";

interface Result {
  ok: boolean;
  error?: string;
}

export interface CheckinRowInput {
  goal_id: string;
  actual_value: number | null;
  actual_date: string | null;
  status: AchievementStatus;
}

/**
 * Single atomic save for the entire current quarter — upserts achievements
 * for every goal on the employee's sheet. Phase-gated server-side.
 */
export async function saveAllAchievements(
  sheetId: string,
  rows: CheckinRowInput[]
): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: cycle } = await supabase
    .from("cycles")
    .select("*")
    .eq("is_active", true)
    .single<Cycle>();
  if (!cycle) return { ok: false, error: "No active cycle" };

  const quarter: Quarter | null = quarterFromPhase(cycle.current_phase);
  if (!quarter) {
    return { ok: false, error: "Check-in window is not open" };
  }

  const { data: sheet } = await supabase
    .from("goal_sheets")
    .select("*")
    .eq("id", sheetId)
    .single<GoalSheet>();
  if (!sheet) return { ok: false, error: "Sheet not found" };
  if (sheet.employee_id !== user.id) {
    return { ok: false, error: "Not your sheet" };
  }
  if (!["approved", "locked"].includes(sheet.status)) {
    return { ok: false, error: "Sheet must be approved before tracking achievements" };
  }

  const upserts = rows.map((r) => ({
    goal_id: r.goal_id,
    quarter,
    actual_value: r.actual_value,
    actual_date: r.actual_date,
    status: r.status,
    updated_by: user.id,
  }));

  const { error } = await supabase
    .from("achievements")
    .upsert(upserts, { onConflict: "goal_id,quarter" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/check-ins");
  revalidatePath("/check-ins/history");
  revalidatePath("/dashboard");

  // Notify manager (best effort)
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (profile?.manager_id) {
    await supabase.from("notifications").insert({
      user_id: profile.manager_id,
      type: "checkin_updated",
      title: `${profile.full_name} updated ${quarter.toUpperCase()} check-in`,
      message: `${rows.length} goal${rows.length === 1 ? "" : "s"} updated`,
      link: `/team/${user.id}`,
    });
  }

  return { ok: true };
}
