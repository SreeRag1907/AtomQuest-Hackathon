"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { goalSheetInputSchema } from "@/lib/validations/goal";
import { sendEmail } from "@/lib/email";
import { goalSubmittedEmail } from "@/lib/email/templates";
import { sendTeamsCard } from "@/lib/teams";
import { goalSubmittedCard } from "@/lib/teams/templates";

export interface GoalDraftInput {
  id?: string | null;
  thrust_area_id: string | null;
  title: string;
  description?: string | null;
  uom_type:
    | "numeric_min"
    | "numeric_max"
    | "percent_min"
    | "percent_max"
    | "timeline"
    | "zero";
  target: number | null;
  target_date: string | null;
  weightage: number | null;
}
import { isGoalSettingPhase } from "@/lib/cycle";
import type { Cycle, GoalSheet, Profile } from "@/types/database";

interface ActionResult<T = unknown> {
  ok: boolean;
  error?: string;
  data?: T;
}

async function ensureEmployeeProfile() {
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

async function getActiveCycle() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cycles")
    .select("*")
    .eq("is_active", true)
    .single<Cycle>();
  return data;
}

/** Initialize an empty draft goal sheet. Idempotent. */
export async function createGoalSheet(): Promise<ActionResult<{ id: string }>> {
  const auth = await ensureEmployeeProfile();
  if ("error" in auth) return { ok: false, error: auth.error };

  const cycle = await getActiveCycle();
  if (!cycle) return { ok: false, error: "No active cycle" };

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("goal_sheets")
    .select("id")
    .eq("employee_id", auth.profile.id)
    .eq("cycle_id", cycle.id)
    .maybeSingle();

  if (existing?.id) {
    return { ok: true, data: { id: existing.id } };
  }

  const { data, error } = await supabase
    .from("goal_sheets")
    .insert({ employee_id: auth.profile.id, cycle_id: cycle.id, status: "draft" })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Failed to create" };

  revalidatePath("/goals");
  return { ok: true, data: { id: data.id } };
}

/**
 * Save draft. Allowed in any phase IF the sheet is editable
 * (status in draft/returned). Validation is forgiving — we let the
 * employee save partial data while drafting.
 */
export async function saveDraft(
  sheetId: string,
  goals: GoalDraftInput[]
): Promise<ActionResult> {
  const auth = await ensureEmployeeProfile();
  if ("error" in auth) return { ok: false, error: auth.error };

  const supabase = await createClient();

  const { data: sheet } = await supabase
    .from("goal_sheets")
    .select("*")
    .eq("id", sheetId)
    .single<GoalSheet>();
  if (!sheet) return { ok: false, error: "Sheet not found" };
  if (sheet.employee_id !== auth.profile.id) return { ok: false, error: "Not authorized" };
  if (!["draft", "returned"].includes(sheet.status)) {
    return { ok: false, error: "This sheet is no longer editable" };
  }

  return await replaceGoals(sheetId, goals);
}

/** Submit for approval. Strict validation — must total 100%. */
export async function submitForApproval(
  sheetId: string,
  goals: GoalDraftInput[]
): Promise<ActionResult> {
  const auth = await ensureEmployeeProfile();
  if ("error" in auth) return { ok: false, error: auth.error };

  const cycle = await getActiveCycle();
  if (!cycle) return { ok: false, error: "No active cycle" };
  if (!isGoalSettingPhase(cycle.current_phase)) {
    return {
      ok: false,
      error: "Goal-setting window is closed. Contact your admin to extend it.",
    };
  }

  const supabase = await createClient();

  const { data: sheet } = await supabase
    .from("goal_sheets")
    .select("*")
    .eq("id", sheetId)
    .single<GoalSheet>();
  if (!sheet || sheet.employee_id !== auth.profile.id) {
    return { ok: false, error: "Not authorized" };
  }
  if (!["draft", "returned"].includes(sheet.status)) {
    return { ok: false, error: "Sheet has already been submitted" };
  }

  const parsed = goalSheetInputSchema.safeParse({ cycle_id: cycle.id, goals });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid sheet" };
  }

  const replaced = await replaceGoals(sheetId, parsed.data.goals);
  if (!replaced.ok) return replaced;

  const { error: updateErr } = await supabase
    .from("goal_sheets")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      return_reason: null,
    })
    .eq("id", sheetId);
  if (updateErr) return { ok: false, error: updateErr.message };

  // Notify manager (in-app + email best-effort)
  if (auth.profile.manager_id) {
    await supabase.from("notifications").insert({
      user_id: auth.profile.manager_id,
      type: "goal_submitted",
      title: `${auth.profile.full_name} submitted goals`,
      message: "Awaiting your review",
      link: "/team/approvals",
    });
    const { data: manager } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", auth.profile.manager_id)
      .single<{ email: string; full_name: string }>();
    if (manager) {
      const link = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/team/approvals`;
      const tpl = goalSubmittedEmail({
        managerName: manager.full_name,
        employeeName: auth.profile.full_name,
        link,
      });
      await sendEmail({ to: manager.email, subject: tpl.subject, html: tpl.html });
      await sendTeamsCard(
        goalSubmittedCard({
          employeeName: auth.profile.full_name,
          managerName: manager.full_name,
          link,
        })
      );
    }
  }

  revalidatePath("/goals");
  revalidatePath(`/goals/${sheetId}`);
  return { ok: true };
}

async function replaceGoals(
  sheetId: string,
  goals: GoalDraftInput[]
): Promise<ActionResult> {
  const supabase = await createClient();

  // We do an upsert-by-id pattern instead of delete+insert. This preserves
  // primary keys, so any child goals on OTHER sheets that reference these
  // rows via parent_goal_id stay correctly linked. We then delete only the
  // rows the user removed in this session.
  const { data: existing } = await supabase
    .from("goals")
    .select("id")
    .eq("goal_sheet_id", sheetId);

  const existingIds = new Set((existing ?? []).map((r) => r.id as string));
  const incomingIds = new Set(
    goals.map((g) => g.id).filter((x): x is string => !!x)
  );
  const toDelete = [...existingIds].filter((id) => !incomingIds.has(id));

  if (toDelete.length > 0) {
    const { error: delErr } = await supabase
      .from("goals")
      .delete()
      .in("id", toDelete);
    if (delErr) return { ok: false, error: delErr.message };
  }

  if (goals.length === 0) {
    revalidatePath("/goals");
    revalidatePath(`/goals/${sheetId}`);
    return { ok: true };
  }

  const updates = goals
    .map((g, idx) => ({ g, idx }))
    .filter(({ g }) => g.id);
  const inserts = goals
    .map((g, idx) => ({ g, idx }))
    .filter(({ g }) => !g.id);

  for (const { g, idx } of updates) {
    const { error } = await supabase
      .from("goals")
      .update({
        thrust_area_id: g.thrust_area_id,
        title: g.title.trim(),
        description: g.description ?? null,
        uom_type: g.uom_type,
        target:
          g.uom_type === "timeline" ? null : g.uom_type === "zero" ? 0 : g.target,
        target_date: g.uom_type === "timeline" ? g.target_date : null,
        weightage: g.weightage ?? 0,
        display_order: idx,
      })
      .eq("id", g.id!)
      .eq("goal_sheet_id", sheetId);
    if (error) return { ok: false, error: error.message };
  }

  if (inserts.length > 0) {
    const rows = inserts.map(({ g, idx }) => ({
      goal_sheet_id: sheetId,
      thrust_area_id: g.thrust_area_id,
      title: g.title.trim(),
      description: g.description ?? null,
      uom_type: g.uom_type,
      target:
        g.uom_type === "timeline" ? null : g.uom_type === "zero" ? 0 : g.target,
      target_date: g.uom_type === "timeline" ? g.target_date : null,
      weightage: g.weightage ?? 0,
      display_order: idx,
    }));
    const { error: insErr } = await supabase.from("goals").insert(rows);
    if (insErr) return { ok: false, error: insErr.message };
  }

  revalidatePath("/goals");
  revalidatePath(`/goals/${sheetId}`);
  return { ok: true };
}
