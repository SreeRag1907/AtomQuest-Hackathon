"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { goalApprovedEmail, goalReturnedEmail } from "@/lib/email/templates";
import type { GoalSheet, Profile } from "@/types/database";

interface Result {
  ok: boolean;
  error?: string;
}

async function authManager() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" } as const;
  const { data: me } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (!me) return { error: "Profile not found" } as const;
  if (me.role !== "manager" && me.role !== "admin") {
    return { error: "Only managers can perform this action" } as const;
  }
  return { me };
}

async function ensureTeamMember(managerId: string, employeeId: string) {
  const supabase = await createClient();
  const { data: emp } = await supabase
    .from("profiles")
    .select("id, manager_id")
    .eq("id", employeeId)
    .single<Pick<Profile, "id" | "manager_id">>();
  if (!emp) return false;
  return emp.manager_id === managerId;
}

export async function approveGoalSheet(sheetId: string): Promise<Result> {
  const auth = await authManager();
  if ("error" in auth) return { ok: false, error: auth.error };
  const supabase = await createClient();

  const { data: sheet } = await supabase
    .from("goal_sheets")
    .select("*")
    .eq("id", sheetId)
    .single<GoalSheet>();
  if (!sheet) return { ok: false, error: "Sheet not found" };

  if (
    auth.me.role !== "admin" &&
    !(await ensureTeamMember(auth.me.id, sheet.employee_id))
  ) {
    return { ok: false, error: "Not authorized" };
  }

  if (sheet.status !== "submitted") {
    return { ok: false, error: "Only submitted sheets can be approved" };
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("goal_sheets")
    .update({
      status: "locked",
      approved_at: now,
      approved_by: auth.me.id,
      locked_at: now,
      return_reason: null,
    })
    .eq("id", sheetId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("notifications").insert({
    user_id: sheet.employee_id,
    type: "goal_approved",
    title: "Your goals were approved",
    message: "The sheet is now locked. Begin tracking achievements each quarter.",
    link: `/goals/${sheetId}`,
  });

  // Email best-effort
  const { data: emp } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", sheet.employee_id)
    .single<{ email: string; full_name: string }>();
  if (emp) {
    const link = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/goals/${sheetId}`;
    const tpl = goalApprovedEmail({ employeeName: emp.full_name, link });
    await sendEmail({ to: emp.email, subject: tpl.subject, html: tpl.html });
  }

  revalidatePath("/team");
  revalidatePath(`/team/${sheet.employee_id}`);
  revalidatePath("/team/approvals");
  return { ok: true };
}

export async function returnGoalSheet(sheetId: string, reason: string): Promise<Result> {
  if (!reason || reason.trim().length < 5) {
    return { ok: false, error: "Provide a reason (5+ chars) so the employee can act on it." };
  }
  const auth = await authManager();
  if ("error" in auth) return { ok: false, error: auth.error };
  const supabase = await createClient();

  const { data: sheet } = await supabase
    .from("goal_sheets")
    .select("*")
    .eq("id", sheetId)
    .single<GoalSheet>();
  if (!sheet) return { ok: false, error: "Sheet not found" };

  if (
    auth.me.role !== "admin" &&
    !(await ensureTeamMember(auth.me.id, sheet.employee_id))
  ) {
    return { ok: false, error: "Not authorized" };
  }

  if (sheet.status !== "submitted") {
    return { ok: false, error: "Only submitted sheets can be returned" };
  }

  const { error } = await supabase
    .from("goal_sheets")
    .update({ status: "returned", return_reason: reason.trim() })
    .eq("id", sheetId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("notifications").insert({
    user_id: sheet.employee_id,
    type: "goal_returned",
    title: "Your goals were returned for rework",
    message: reason.trim(),
    link: `/goals/${sheetId}`,
  });

  // Email best-effort
  const { data: emp } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", sheet.employee_id)
    .single<{ email: string; full_name: string }>();
  if (emp) {
    const link = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/goals/${sheetId}`;
    const tpl = goalReturnedEmail({
      employeeName: emp.full_name,
      reason: reason.trim(),
      link,
    });
    await sendEmail({ to: emp.email, subject: tpl.subject, html: tpl.html });
  }

  revalidatePath("/team");
  revalidatePath(`/team/${sheet.employee_id}`);
  revalidatePath("/team/approvals");
  return { ok: true };
}

/**
 * Manager-side inline edit of submitted goals during approval review.
 * Allows tweaking weightage, target/target_date, title or thrust area before
 * approving so the back-and-forth of "return → fix → resubmit" can be skipped
 * for minor adjustments. Audit trigger captures every change.
 *
 * Restrictions:
 * - Sheet must be in `submitted` status (under review)
 * - Sum of weightages must remain 100%
 * - Cannot edit child (shared) goals — those mirror their parent
 */
export async function managerUpdateGoals(
  sheetId: string,
  edits: Array<{
    id: string;
    title?: string;
    description?: string | null;
    target?: number | null;
    target_date?: string | null;
    weightage?: number;
    thrust_area_id?: string | null;
  }>
): Promise<Result> {
  const auth = await authManager();
  if ("error" in auth) return { ok: false, error: auth.error };
  const supabase = await createClient();

  const { data: sheet } = await supabase
    .from("goal_sheets")
    .select("*")
    .eq("id", sheetId)
    .single<GoalSheet>();
  if (!sheet) return { ok: false, error: "Sheet not found" };
  if (
    auth.me.role !== "admin" &&
    !(await ensureTeamMember(auth.me.id, sheet.employee_id))
  ) {
    return { ok: false, error: "Not authorized" };
  }
  if (sheet.status !== "submitted") {
    return { ok: false, error: "Inline edits are only allowed during review (submitted state)" };
  }

  const { data: existing } = await supabase
    .from("goals")
    .select("id, weightage, parent_goal_id")
    .eq("goal_sheet_id", sheetId);
  const byId = new Map((existing ?? []).map((g) => [g.id, g]));

  // Validate ownership and child-lock
  for (const e of edits) {
    const g = byId.get(e.id);
    if (!g) return { ok: false, error: `Goal ${e.id} not on this sheet` };
    if (g.parent_goal_id) {
      return {
        ok: false,
        error:
          "One or more goals are linked shared goals (auto-synced). Edit the primary goal instead.",
      };
    }
  }

  // Compute resulting weightage total
  let total = 0;
  for (const g of existing ?? []) {
    const e = edits.find((x) => x.id === g.id);
    total += e?.weightage ?? g.weightage;
  }
  if (total !== 100) {
    return {
      ok: false,
      error: `Weightages must sum to 100% (currently ${total}%)`,
    };
  }

  for (const e of edits) {
    const patch: Record<string, unknown> = {};
    if (e.title !== undefined) patch.title = e.title.trim();
    if (e.description !== undefined) patch.description = e.description;
    if (e.target !== undefined) patch.target = e.target;
    if (e.target_date !== undefined) patch.target_date = e.target_date;
    if (e.weightage !== undefined) patch.weightage = e.weightage;
    if (e.thrust_area_id !== undefined) patch.thrust_area_id = e.thrust_area_id;
    if (Object.keys(patch).length === 0) continue;
    const { error } = await supabase
      .from("goals")
      .update(patch)
      .eq("id", e.id)
      .eq("goal_sheet_id", sheetId);
    if (error) return { ok: false, error: error.message };
  }

  await supabase.from("notifications").insert({
    user_id: sheet.employee_id,
    type: "manager_edited",
    title: "Manager adjusted your goals during review",
    message: "See the audit history for details.",
    link: `/goals/${sheetId}`,
  });

  revalidatePath(`/team/${sheet.employee_id}`);
  revalidatePath(`/goals/${sheetId}`);
  return { ok: true };
}

export async function saveCheckinComment(
  sheetId: string,
  quarter: string,
  comment: string
): Promise<Result> {
  if (!comment || comment.trim().length < 1) {
    return { ok: false, error: "Comment cannot be empty" };
  }
  const auth = await authManager();
  if ("error" in auth) return { ok: false, error: auth.error };

  const supabase = await createClient();
  const { data: sheet } = await supabase
    .from("goal_sheets")
    .select("*")
    .eq("id", sheetId)
    .single<GoalSheet>();
  if (!sheet) return { ok: false, error: "Sheet not found" };

  if (
    auth.me.role !== "admin" &&
    !(await ensureTeamMember(auth.me.id, sheet.employee_id))
  ) {
    return { ok: false, error: "Not authorized" };
  }

  const { error } = await supabase.from("checkin_comments").insert({
    goal_sheet_id: sheetId,
    quarter,
    manager_id: auth.me.id,
    comment: comment.trim(),
  });
  if (error) return { ok: false, error: error.message };

  await supabase.from("notifications").insert({
    user_id: sheet.employee_id,
    type: "checkin_comment",
    title: `New manager comment on ${quarter.toUpperCase()}`,
    message: comment.trim().slice(0, 140),
    link: `/check-ins/history`,
  });

  revalidatePath(`/team/${sheet.employee_id}`);
  return { ok: true };
}
