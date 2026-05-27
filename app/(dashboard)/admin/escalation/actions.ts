"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { checkinReminderEmail } from "@/lib/email/templates";
import { sendTeamsCard } from "@/lib/teams";
import { escalationCard } from "@/lib/teams/templates";
import { quarterFromPhase, phaseLabel } from "@/lib/cycle";
import type {
  Cycle,
  EscalationRule,
  EscalationTriggerEvent,
  GoalSheet,
  Profile,
} from "@/types/database";

interface Result<T = unknown> {
  ok: boolean;
  error?: string;
  data?: T;
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" } as const;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile || profile.role !== "admin") {
    return { error: "Admin only" } as const;
  }
  return { user, profile };
}

// ============================================================
// Rule CRUD
// ============================================================

export interface RuleInput {
  name: string;
  trigger_event: EscalationTriggerEvent;
  threshold_days: number;
  notify_employee: boolean;
  notify_manager: boolean;
  notify_hr: boolean;
}

export async function createRule(input: RuleInput): Promise<Result> {
  const auth = await requireAdmin();
  if ("error" in auth) return { ok: false, error: auth.error };
  if (!input.name.trim() || input.threshold_days < 1) {
    return { ok: false, error: "Name and threshold (>=1 day) are required" };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("escalation_rules").insert({
    name: input.name.trim(),
    trigger_event: input.trigger_event,
    threshold_days: input.threshold_days,
    notify_employee: input.notify_employee,
    notify_manager: input.notify_manager,
    notify_hr: input.notify_hr,
    created_by: auth.user.id,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/escalation");
  return { ok: true };
}

export async function updateRule(
  ruleId: string,
  patch: Partial<RuleInput>
): Promise<Result> {
  const auth = await requireAdmin();
  if ("error" in auth) return { ok: false, error: auth.error };
  const supabase = await createClient();
  const { error } = await supabase
    .from("escalation_rules")
    .update(patch)
    .eq("id", ruleId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/escalation");
  return { ok: true };
}

export async function toggleRule(
  ruleId: string,
  isActive: boolean
): Promise<Result> {
  return updateRule(ruleId, { is_active: isActive } as Partial<RuleInput> & { is_active: boolean });
}

export async function deleteRule(ruleId: string): Promise<Result> {
  const auth = await requireAdmin();
  if ("error" in auth) return { ok: false, error: auth.error };
  const supabase = await createClient();
  const { error } = await supabase
    .from("escalation_rules")
    .delete()
    .eq("id", ruleId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/escalation");
  return { ok: true };
}

export async function resolveEscalation(
  logId: string,
  notes?: string
): Promise<Result> {
  const auth = await requireAdmin();
  if ("error" in auth) return { ok: false, error: auth.error };
  const supabase = await createClient();
  const { error } = await supabase
    .from("escalation_log")
    .update({
      resolved_at: new Date().toISOString(),
      resolved_by: auth.user.id,
      notes: notes?.trim() || null,
    })
    .eq("id", logId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/escalation");
  return { ok: true };
}

// ============================================================
// Engine — runs every active rule and inserts log rows
// ============================================================

interface FireResult {
  ruleId: string;
  ruleName: string;
  trigger: EscalationTriggerEvent;
  fired: number;
  skipped: number;
}

export async function runEscalationCheck(): Promise<Result<FireResult[]>> {
  const auth = await requireAdmin();
  if ("error" in auth) return { ok: false, error: auth.error };
  const supabase = await createClient();

  const { data: cycle } = await supabase
    .from("cycles")
    .select("*")
    .eq("is_active", true)
    .single<Cycle>();
  if (!cycle) return { ok: false, error: "No active cycle" };

  const { data: rules } = await supabase
    .from("escalation_rules")
    .select("*")
    .eq("is_active", true);

  const results: FireResult[] = [];

  for (const rule of (rules ?? []) as EscalationRule[]) {
    const fired = await fireRule(rule, cycle);
    results.push({
      ruleId: rule.id,
      ruleName: rule.name,
      trigger: rule.trigger_event,
      fired: fired.fired,
      skipped: fired.skipped,
    });
  }

  revalidatePath("/admin/escalation");
  return { ok: true, data: results };
}

interface RuleFireOutcome {
  fired: number;
  skipped: number;
}

async function fireRule(
  rule: EscalationRule,
  cycle: Cycle
): Promise<RuleFireOutcome> {
  switch (rule.trigger_event) {
    case "goals_not_submitted":
      return await fireGoalsNotSubmitted(rule, cycle);
    case "goals_not_approved":
      return await fireGoalsNotApproved(rule, cycle);
    case "checkin_not_done":
      return await fireCheckinNotDone(rule, cycle);
  }
}

function daysAgo(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const past = new Date(dateStr).getTime();
  const diff = Date.now() - past;
  return Math.floor(diff / 86400000);
}

async function fireGoalsNotSubmitted(
  rule: EscalationRule,
  cycle: Cycle
): Promise<RuleFireOutcome> {
  const supabase = await createClient();

  // SLA only meaningful once goal-setting has been open at least N days
  const sinceOpen = daysAgo(cycle.goal_setting_opens);
  if (sinceOpen == null || sinceOpen < rule.threshold_days) {
    return { fired: 0, skipped: 0 };
  }

  const { data: employees } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "employee")
    .eq("is_active", true);

  const { data: sheets } = await supabase
    .from("goal_sheets")
    .select("*")
    .eq("cycle_id", cycle.id);

  const sheetByEmp = new Map(
    (sheets ?? []).map((s) => [s.employee_id, s as GoalSheet])
  );

  let fired = 0;
  let skipped = 0;

  for (const emp of (employees ?? []) as Profile[]) {
    const sheet = sheetByEmp.get(emp.id);
    const isOverdue =
      !sheet || ["draft", "returned"].includes(sheet.status);
    if (!isOverdue) continue;

    const inserted = await tryFireOnce(rule, emp);
    if (inserted) {
      fired++;
      await dispatchNotifications(rule, emp, {
        title: "Action needed: submit your goals",
        message: `Goal-setting opened ${sinceOpen} days ago. Please submit by the cycle deadline.`,
        link: "/goals",
      });
    } else {
      skipped++;
    }
  }
  return { fired, skipped };
}

async function fireGoalsNotApproved(
  rule: EscalationRule,
  cycle: Cycle
): Promise<RuleFireOutcome> {
  const supabase = await createClient();

  const { data: pending } = await supabase
    .from("goal_sheets")
    .select("*")
    .eq("cycle_id", cycle.id)
    .eq("status", "submitted");

  let fired = 0;
  let skipped = 0;

  for (const sheet of (pending ?? []) as GoalSheet[]) {
    const stale = daysAgo(sheet.submitted_at);
    if (stale == null || stale < rule.threshold_days) continue;

    const { data: emp } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", sheet.employee_id)
      .single<Profile>();
    if (!emp) continue;

    const inserted = await tryFireOnce(rule, emp);
    if (inserted) {
      fired++;
      await dispatchNotifications(rule, emp, {
        title: "Approval overdue",
        message: `${emp.full_name}'s sheet has been awaiting approval for ${stale} days.`,
        link: `/team/${emp.id}`,
      });
    } else {
      skipped++;
    }
  }
  return { fired, skipped };
}

async function fireCheckinNotDone(
  rule: EscalationRule,
  cycle: Cycle
): Promise<RuleFireOutcome> {
  const supabase = await createClient();

  const quarter = quarterFromPhase(cycle.current_phase);
  if (!quarter) return { fired: 0, skipped: 0 };

  const quarterOpensField = `${quarter}_opens` as
    | "q1_opens"
    | "q2_opens"
    | "q3_opens"
    | "q4_opens";
  const quarterOpens = cycle[quarterOpensField];
  const sinceOpen = daysAgo(quarterOpens);
  if (sinceOpen == null || sinceOpen < rule.threshold_days) {
    return { fired: 0, skipped: 0 };
  }

  const { data: sheets } = await supabase
    .from("goal_sheets")
    .select("*")
    .eq("cycle_id", cycle.id)
    .in("status", ["approved", "locked"]);

  const sheetIds = (sheets ?? []).map((s) => s.id);
  if (sheetIds.length === 0) return { fired: 0, skipped: 0 };

  const { data: goals } = await supabase
    .from("goals")
    .select("id, goal_sheet_id")
    .in("goal_sheet_id", sheetIds);

  const goalIds = (goals ?? []).map((g) => g.id);
  const { data: achievements } = goalIds.length
    ? await supabase
        .from("achievements")
        .select("goal_id")
        .in("goal_id", goalIds)
        .eq("quarter", quarter)
    : { data: [] };

  const goalsWithAchievement = new Set(
    (achievements ?? []).map((a) => (a as { goal_id: string }).goal_id)
  );
  const goalsBySheet = new Map<string, string[]>();
  for (const g of (goals ?? []) as Array<{ id: string; goal_sheet_id: string }>) {
    const arr = goalsBySheet.get(g.goal_sheet_id) ?? [];
    arr.push(g.id);
    goalsBySheet.set(g.goal_sheet_id, arr);
  }

  let fired = 0;
  let skipped = 0;

  for (const sheet of (sheets ?? []) as GoalSheet[]) {
    const sheetGoals = goalsBySheet.get(sheet.id) ?? [];
    const hasAny = sheetGoals.some((gid) => goalsWithAchievement.has(gid));
    if (hasAny || sheetGoals.length === 0) continue;

    const { data: emp } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", sheet.employee_id)
      .single<Profile>();
    if (!emp) continue;

    const inserted = await tryFireOnce(rule, emp);
    if (inserted) {
      fired++;
      // Email reminder + Teams notification
      const closeDate = cycle[`${quarter}_closes` as "q1_closes" | "q2_closes" | "q3_closes" | "q4_closes"];
      if (rule.notify_employee && emp.email) {
        const tpl = checkinReminderEmail({
          employeeName: emp.full_name,
          quarter,
          closes: closeDate
            ? new Date(closeDate).toLocaleDateString()
            : "soon",
          link: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/check-ins`,
        });
        await sendEmail({ to: emp.email, subject: tpl.subject, html: tpl.html });
      }
      await dispatchNotifications(rule, emp, {
        title: `Reminder: ${quarter.toUpperCase()} check-in pending`,
        message: `${phaseLabel(cycle.current_phase)} opened ${sinceOpen} days ago. Please update your actuals.`,
        link: "/check-ins",
        skipEmployeeEmail: true, // already sent above
      });
    } else {
      skipped++;
    }
  }
  return { fired, skipped };
}

/**
 * Insert an escalation_log row, deduped by the unique partial index
 * (rule_id, employee_id, fired_at::date) where resolved_at is null.
 * Returns true if a new row was inserted.
 */
async function tryFireOnce(
  rule: EscalationRule,
  employee: Profile
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("escalation_log").insert({
    rule_id: rule.id,
    employee_id: employee.id,
    trigger_event: rule.trigger_event,
  });
  if (error) {
    // 23505 = unique violation → already fired today
    if (error.code === "23505") return false;
    console.error("[escalation] log insert failed", error);
    return false;
  }
  return true;
}

interface NotifyParams {
  title: string;
  message: string;
  link: string;
  skipEmployeeEmail?: boolean;
}

async function dispatchNotifications(
  rule: EscalationRule,
  employee: Profile,
  params: NotifyParams
): Promise<void> {
  const supabase = await createClient();
  const targets: Array<{ id: string; email: string; full_name: string; role: string }> = [];

  if (rule.notify_employee) {
    targets.push({
      id: employee.id,
      email: employee.email,
      full_name: employee.full_name,
      role: "employee",
    });
  }

  if (rule.notify_manager && employee.manager_id) {
    const { data: mgr } = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("id", employee.manager_id)
      .single<{ id: string; email: string; full_name: string; role: string }>();
    if (mgr) targets.push(mgr);
  }

  if (rule.notify_hr) {
    const { data: hrUsers } = await supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("role", "admin")
      .eq("is_active", true);
    for (const hr of hrUsers ?? []) {
      targets.push(hr as { id: string; email: string; full_name: string; role: string });
    }
  }

  // In-app notifications
  if (targets.length > 0) {
    await supabase.from("notifications").insert(
      targets.map((t) => ({
        user_id: t.id,
        type: "escalation",
        title: params.title,
        message: params.message,
        link: params.link,
      }))
    );
  }

  // Email best-effort (skip employee email when caller already sent one)
  for (const t of targets) {
    if (params.skipEmployeeEmail && t.role === "employee") continue;
    if (!t.email) continue;
    await sendEmail({
      to: t.email,
      subject: `[AtomQuest] ${params.title}`,
      html: `<p>${params.message}</p><p><a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}${params.link}">Open in Portal</a></p>`,
    });
  }

  // Teams card (single channel — webhook based)
  await sendTeamsCard(
    escalationCard({
      employeeName: employee.full_name,
      ruleName: rule.name,
      triggerEvent: rule.trigger_event,
      link: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/escalation`,
    })
  );
}

/**
 * Manual one-click reminder available on the team detail / check-ins
 * pages. Manager can fire a reminder without waiting for the rules engine.
 */
export async function sendCheckinReminder(employeeId: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: me } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (!me) return { ok: false, error: "Profile missing" };
  if (me.role !== "manager" && me.role !== "admin") {
    return { ok: false, error: "Managers/admins only" };
  }

  const { data: emp } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", employeeId)
    .single<Profile>();
  if (!emp) return { ok: false, error: "Employee not found" };
  if (me.role === "manager" && emp.manager_id !== me.id) {
    return { ok: false, error: "Not your direct report" };
  }

  const { data: cycle } = await supabase
    .from("cycles")
    .select("*")
    .eq("is_active", true)
    .single<Cycle>();
  if (!cycle) return { ok: false, error: "No active cycle" };

  const quarter = quarterFromPhase(cycle.current_phase);
  if (!quarter) {
    return { ok: false, error: "Reminders are only useful during a check-in window" };
  }

  const closes =
    cycle[
      `${quarter}_closes` as "q1_closes" | "q2_closes" | "q3_closes" | "q4_closes"
    ];

  // Cooldown: don't let a manager fire reminders more than once every 12 hours
  // for the same employee + quarter. Stops accidental spam and keeps escalation
  // signals meaningful.
  const COOLDOWN_HOURS = 12;
  const cutoff = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
  const reminderTitle = `${quarter.toUpperCase()} check-in reminder`;
  const { data: recent } = await supabase
    .from("notifications")
    .select("created_at")
    .eq("user_id", emp.id)
    .eq("type", "checkin_reminder")
    .eq("title", reminderTitle)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1);
  if (recent && recent.length > 0) {
    return {
      ok: false,
      error: `A reminder was already sent recently. Try again after ${COOLDOWN_HOURS}h.`,
    };
  }

  await supabase.from("notifications").insert({
    user_id: emp.id,
    type: "checkin_reminder",
    title: reminderTitle,
    message: `${me.full_name} sent you a check-in reminder.`,
    link: "/check-ins",
  });

  if (emp.email) {
    const tpl = checkinReminderEmail({
      employeeName: emp.full_name,
      quarter,
      closes: closes ? new Date(closes).toLocaleDateString() : "soon",
      link: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/check-ins`,
    });
    await sendEmail({ to: emp.email, subject: tpl.subject, html: tpl.html });
  }

  return { ok: true };
}
