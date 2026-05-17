"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Cycle, Goal, GoalSheet, Profile } from "@/types/database";

interface ActionResult {
  ok: boolean;
  error?: string;
  pushed?: number;
  skipped?: { id: string; reason: string }[];
}

async function getCaller() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" } as const;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) return { error: "Profile not found" } as const;
  return { profile };
}

/**
 * Push a goal owned by the caller (manager/admin) as a shared goal to a list of
 * recipient employees. For each recipient we ensure they have a draft sheet on
 * the active cycle and insert a child goal row that links back to the parent.
 *
 * Permission rules:
 * - Caller must be admin OR a manager whose direct reports include all
 *   recipients.
 * - Recipients must not already have a child of this parent.
 */
export async function pushSharedGoal(
  parentGoalId: string,
  recipientIds: string[],
  defaultWeightage = 10
): Promise<ActionResult> {
  const caller = await getCaller();
  if ("error" in caller) return { ok: false, error: caller.error };
  if (caller.profile.role === "employee") {
    return { ok: false, error: "Only managers/admins can push shared goals" };
  }
  if (recipientIds.length === 0) {
    return { ok: false, error: "Pick at least one recipient" };
  }

  const supabase = await createClient();

  const { data: parentGoal } = await supabase
    .from("goals")
    .select("*")
    .eq("id", parentGoalId)
    .single<Goal>();
  if (!parentGoal) return { ok: false, error: "Goal not found" };
  if (parentGoal.parent_goal_id) {
    return {
      ok: false,
      error: "This is already a child of another shared goal — push the primary instead.",
    };
  }

  // Confirm parent goal belongs to caller's sheet
  const { data: parentSheet } = await supabase
    .from("goal_sheets")
    .select("*")
    .eq("id", parentGoal.goal_sheet_id)
    .single<GoalSheet>();
  if (!parentSheet || parentSheet.employee_id !== caller.profile.id) {
    return { ok: false, error: "You can only push goals from your own sheet" };
  }

  const { data: cycle } = await supabase
    .from("cycles")
    .select("*")
    .eq("id", parentSheet.cycle_id)
    .single<Cycle>();
  if (!cycle) return { ok: false, error: "Active cycle missing" };

  // Verify recipients
  const { data: recipients } = await supabase
    .from("profiles")
    .select("*")
    .in("id", recipientIds);
  if (!recipients || recipients.length !== recipientIds.length) {
    return { ok: false, error: "One or more recipients not found" };
  }
  if (caller.profile.role === "manager") {
    const ok = recipients.every(
      (r) => r.manager_id === caller.profile.id && r.is_active
    );
    if (!ok) {
      return {
        ok: false,
        error: "Managers can only share with their own direct reports",
      };
    }
  }

  // Mark parent as shared if not already
  if (!parentGoal.is_shared) {
    await supabase
      .from("goals")
      .update({ is_shared: true })
      .eq("id", parentGoal.id);
  }

  const skipped: { id: string; reason: string }[] = [];
  let pushed = 0;

  for (const r of recipients) {
    let { data: sheet } = await supabase
      .from("goal_sheets")
      .select("*")
      .eq("employee_id", r.id)
      .eq("cycle_id", cycle.id)
      .maybeSingle<GoalSheet>();
    if (!sheet) {
      const { data: created, error: createErr } = await supabase
        .from("goal_sheets")
        .insert({
          employee_id: r.id,
          cycle_id: cycle.id,
          status: "draft",
        })
        .select("*")
        .single<GoalSheet>();
      if (createErr || !created) {
        skipped.push({ id: r.id, reason: createErr?.message ?? "Could not create sheet" });
        continue;
      }
      sheet = created;
    }

    if (sheet.status === "locked" || sheet.status === "approved") {
      skipped.push({
        id: r.id,
        reason: "Sheet is locked/approved — unlock first",
      });
      continue;
    }

    const { data: existingChild } = await supabase
      .from("goals")
      .select("id")
      .eq("goal_sheet_id", sheet.id)
      .eq("parent_goal_id", parentGoal.id)
      .maybeSingle();
    if (existingChild) {
      skipped.push({ id: r.id, reason: "Already shared with this user" });
      continue;
    }

    const { data: maxOrder } = await supabase
      .from("goals")
      .select("display_order")
      .eq("goal_sheet_id", sheet.id)
      .order("display_order", { ascending: false })
      .limit(1)
      .maybeSingle<{ display_order: number }>();
    const nextOrder = (maxOrder?.display_order ?? -1) + 1;

    const { error: insErr } = await supabase.from("goals").insert({
      goal_sheet_id: sheet.id,
      thrust_area_id: parentGoal.thrust_area_id,
      title: parentGoal.title,
      description: parentGoal.description,
      uom_type: parentGoal.uom_type,
      target: parentGoal.target,
      target_date: parentGoal.target_date,
      weightage: defaultWeightage,
      display_order: nextOrder,
      is_shared: true,
      parent_goal_id: parentGoal.id,
    });
    if (insErr) {
      skipped.push({ id: r.id, reason: insErr.message });
      continue;
    }

    await supabase.from("notifications").insert({
      user_id: r.id,
      type: "shared_goal",
      title: "A shared goal was added to your sheet",
      message: `"${parentGoal.title}" — adjust weightage as needed`,
      link: `/goals/${sheet.id}`,
    });
    pushed += 1;
  }

  revalidatePath("/goals");
  revalidatePath(`/goals/${parentSheet.id}`);
  return { ok: true, pushed, skipped };
}

/**
 * Unlink one or more recipients from a shared goal (deletes the child row).
 */
export async function removeSharedRecipients(
  parentGoalId: string,
  recipientIds: string[]
): Promise<ActionResult> {
  const caller = await getCaller();
  if ("error" in caller) return { ok: false, error: caller.error };
  if (caller.profile.role === "employee") {
    return { ok: false, error: "Only managers/admins can manage shared goals" };
  }
  if (recipientIds.length === 0) return { ok: true };

  const supabase = await createClient();

  const { data: parentGoal } = await supabase
    .from("goals")
    .select("*, goal_sheets(employee_id, cycle_id)")
    .eq("id", parentGoalId)
    .single<Goal & { goal_sheets: { employee_id: string; cycle_id: string } }>();
  if (!parentGoal) return { ok: false, error: "Parent goal not found" };
  if (
    caller.profile.role !== "admin" &&
    parentGoal.goal_sheets.employee_id !== caller.profile.id
  ) {
    return { ok: false, error: "Not authorized" };
  }

  // Scope sheet lookup to the same cycle so we never delete from a different cycle's sheet
  const { data: sheets } = await supabase
    .from("goal_sheets")
    .select("id, employee_id")
    .in("employee_id", recipientIds)
    .eq("cycle_id", parentGoal.goal_sheets.cycle_id);
  const sheetIds = (sheets ?? []).map((s) => s.id);

  if (sheetIds.length > 0) {
    const { error } = await supabase
      .from("goals")
      .delete()
      .eq("parent_goal_id", parentGoalId)
      .in("goal_sheet_id", sheetIds);
    if (error) return { ok: false, error: error.message };
  }

  // If no children remain, unmark parent as shared.
  const { count } = await supabase
    .from("goals")
    .select("id", { count: "exact", head: true })
    .eq("parent_goal_id", parentGoalId);
  if ((count ?? 0) === 0) {
    await supabase.from("goals").update({ is_shared: false }).eq("id", parentGoalId);
  }

  revalidatePath("/goals");
  return { ok: true };
}
