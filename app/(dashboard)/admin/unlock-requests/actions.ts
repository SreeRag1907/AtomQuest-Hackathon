"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { GoalSheet, Profile } from "@/types/database";

interface Result {
  ok: boolean;
  error?: string;
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" } as const;
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (!data || data.role !== "admin") return { error: "Admin only" } as const;
  return { user, profile: data };
}

/** Admin direct unlock — flips locked → approved with mandatory reason. Logged. */
export async function adminUnlockSheet(sheetId: string, reason: string): Promise<Result> {
  if (!reason || reason.trim().length < 5) {
    return { ok: false, error: "Reason (5+ chars) is required for governance audit" };
  }
  const auth = await requireAdmin();
  if ("error" in auth) return { ok: false, error: auth.error };
  const supabase = await createClient();
  const { data: sheet } = await supabase
    .from("goal_sheets")
    .select("*")
    .eq("id", sheetId)
    .single<GoalSheet>();
  if (!sheet) return { ok: false, error: "Sheet not found" };
  if (sheet.status !== "locked") {
    return { ok: false, error: "Only locked sheets can be unlocked" };
  }
  const { error } = await supabase
    .from("goal_sheets")
    .update({ status: "approved", locked_at: null })
    .eq("id", sheetId);
  if (error) return { ok: false, error: error.message };

  // Manual audit row with reason (the trigger captures the diff,
  // but we add a contextual entry tagged with action=unlocked).
  await supabase.from("audit_log").insert({
    entity_type: "goal_sheets",
    entity_id: sheetId,
    action: "unlocked",
    changed_by: auth.user.id,
    before_value: { status: "locked" },
    after_value: { status: "approved" },
    reason: reason.trim(),
  });

  // Notify employee
  await supabase.from("notifications").insert({
    user_id: sheet.employee_id,
    type: "goal_unlocked",
    title: "Your goals were unlocked for editing",
    message: reason.trim(),
    link: `/goals/${sheetId}`,
  });

  revalidatePath("/admin/unlock-requests");
  revalidatePath(`/team/${sheet.employee_id}`);
  return { ok: true };
}

export async function decideUnlockRequest(
  requestId: string,
  decision: "approved" | "rejected",
  reason: string
): Promise<Result> {
  const auth = await requireAdmin();
  if ("error" in auth) return { ok: false, error: auth.error };
  const supabase = await createClient();

  const { data: req } = await supabase
    .from("unlock_requests")
    .select("*")
    .eq("id", requestId)
    .single();
  if (!req) return { ok: false, error: "Request not found" };
  if (req.status !== "pending") {
    return { ok: false, error: `Request already ${req.status}` };
  }

  const reviewedAt = new Date().toISOString();

  if (decision === "approved") {
    // Perform the unlock FIRST. Only on success do we mark the request approved.
    // If the sheet update fails the request stays pending so admins can retry.
    const unlock = await adminUnlockSheet(req.goal_sheet_id, reason || req.reason);
    if (!unlock.ok) return unlock;

    const { error: updateErr } = await supabase
      .from("unlock_requests")
      .update({ status: "approved", reviewed_by: auth.user.id, reviewed_at: reviewedAt })
      .eq("id", requestId);
    if (updateErr) {
      // Sheet is now unlocked, but request didn't transition. Surface so the
      // admin can retry the metadata write; the sheet state is still correct.
      return { ok: false, error: `Sheet unlocked, but request status update failed: ${updateErr.message}` };
    }
    revalidatePath("/admin/unlock-requests");
    return { ok: true };
  }

  // Rejected path: mark request, notify, no sheet mutation.
  const { error: rejectErr } = await supabase
    .from("unlock_requests")
    .update({ status: "rejected", reviewed_by: auth.user.id, reviewed_at: reviewedAt })
    .eq("id", requestId);
  if (rejectErr) return { ok: false, error: rejectErr.message };

  await supabase.from("notifications").insert({
    user_id: req.requested_by,
    type: "unlock_rejected",
    title: "Unlock request rejected",
    message: reason || "Decision: rejected",
    link: "/goals",
  });

  revalidatePath("/admin/unlock-requests");
  return { ok: true };
}
