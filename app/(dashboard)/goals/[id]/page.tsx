import { notFound } from "next/navigation";
import Link from "next/link";
import { History as HistoryIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GoalStatusBadge } from "@/components/status-badge";
import { GoalSheetForm } from "@/components/goals/goal-sheet-form";
import { AuditDrawer } from "@/components/audit-drawer";
import { Badge } from "@/components/ui/badge";
import { UOM_LABELS } from "@/lib/validations/goal";
import type { Goal, GoalSheet, ThrustArea, Profile } from "@/types/database";

export default async function GoalSheetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: sheet } = await supabase
    .from("goal_sheets")
    .select("*")
    .eq("id", id)
    .single<GoalSheet>();

  if (!sheet) notFound();

  const { data: employee } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", sheet.employee_id)
    .single<Profile>();

  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("goal_sheet_id", sheet.id)
    .order("display_order");

  const { data: thrustAreas } = await supabase
    .from("thrust_areas")
    .select("*")
    .eq("is_active", true);

  const taById = new Map(
    (thrustAreas ?? ([] as ThrustArea[])).map((t) => [t.id, t])
  );

  const isOwner = sheet.employee_id === profile.id;
  const isEditable = isOwner && ["draft", "returned"].includes(sheet.status);

  // --- Shared-goal context ---
  // Existing recipients per parent goal owned by this sheet
  const goalIds = (goals ?? []).map((g) => g.id);
  const recipientsByGoalId: Record<string, string[]> = {};
  if (goalIds.length > 0) {
    const { data: recRows } = await supabase
      .from("shared_goal_recipients")
      .select("parent_goal_id, recipient_id")
      .in("parent_goal_id", goalIds);
    for (const r of recRows ?? []) {
      const pid = (r as { parent_goal_id: string }).parent_goal_id;
      const rid = (r as { recipient_id: string }).recipient_id;
      (recipientsByGoalId[pid] ??= []).push(rid);
    }
  }

  // For child goals: build childGoalId -> parentOwnerName map
  const childParentIds = (goals ?? [])
    .map((g) => g.parent_goal_id)
    .filter((x): x is string => !!x);
  const parentOwnerByGoalId: Record<string, string> = {};
  if (childParentIds.length > 0) {
    const { data: parentRows } = await supabase
      .from("goals")
      .select("id, goal_sheets(employee_id, profiles:employee_id(full_name))")
      .in("id", childParentIds);
    type ParentRow = {
      id: string;
      goal_sheets:
        | { employee_id: string; profiles: { full_name: string } | null }
        | null;
    };
    const ownerByParent = new Map<string, string>();
    for (const row of (parentRows ?? []) as unknown as ParentRow[]) {
      const name = row.goal_sheets?.profiles?.full_name;
      if (name) ownerByParent.set(row.id, name);
    }
    for (const g of goals ?? []) {
      if (g.parent_goal_id) {
        const owner = ownerByParent.get(g.parent_goal_id);
        if (owner) parentOwnerByGoalId[g.id] = owner;
      }
    }
  }

  // Share candidates: managers see direct reports; admins see all employees
  let shareCandidates: Profile[] = [];
  const canShare = profile.role !== "employee";
  if (canShare) {
    if (profile.role === "admin") {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", profile.id)
        .eq("is_active", true)
        .order("full_name");
      shareCandidates = (data ?? []) as Profile[];
    } else if (profile.role === "manager") {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("manager_id", profile.id)
        .eq("is_active", true)
        .order("full_name");
      shareCandidates = (data ?? []) as Profile[];
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goal sheet"
        description={isOwner ? null : `${employee?.full_name}'s goal sheet`}
        actions={
          <AuditDrawer
            entityType={["goal_sheets", "goals"]}
            entityIds={[sheet.id, ...(goals ?? []).map((g) => g.id)]}
            trigger={
              <Button variant="outline" size="sm">
                <HistoryIcon className="h-4 w-4" />
                Audit history
              </Button>
            }
          />
        }
      />

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          <Field label="Status">
            <GoalStatusBadge status={sheet.status} />
          </Field>
          <Field label="Submitted">
            {sheet.submitted_at
              ? new Date(sheet.submitted_at).toLocaleDateString()
              : "—"}
          </Field>
          <Field label="Approved">
            {sheet.approved_at
              ? new Date(sheet.approved_at).toLocaleDateString()
              : "—"}
          </Field>
          <Field label="Locked">
            {sheet.locked_at
              ? new Date(sheet.locked_at).toLocaleDateString()
              : "—"}
          </Field>
        </CardContent>
      </Card>

      {sheet.status === "returned" && sheet.return_reason && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-destructive">Returned for rework</div>
              <p className="mt-1 text-sm text-foreground">{sheet.return_reason}</p>
              {isOwner && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Update your goals below and resubmit when you&apos;re ready.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {isEditable ? (
        <GoalSheetForm
          sheetId={sheet.id}
          initialGoals={(goals ?? []) as Goal[]}
          thrustAreas={(thrustAreas ?? []) as ThrustArea[]}
          isReturned={sheet.status === "returned"}
          returnReason={sheet.return_reason}
          canShare={canShare && isOwner}
          shareCandidates={shareCandidates.map((p) => ({
            id: p.id,
            full_name: p.full_name,
            email: p.email,
            department: p.department,
          }))}
          recipientsByGoalId={recipientsByGoalId}
          parentOwnerByGoalId={parentOwnerByGoalId}
        />
      ) : (
        <div className="space-y-3">
          {(goals ?? []).map((g, idx) => (
            <Card key={g.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {idx + 1}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{g.title}</div>
                      {g.description && (
                        <div className="mt-1 text-sm text-muted-foreground">{g.description}</div>
                      )}
                    </div>
                  </div>
                  <Badge variant="muted" className="shrink-0">
                    {g.weightage}%
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-3 border-t pt-3 text-xs sm:grid-cols-4">
                  <Field label="Thrust area">
                    {g.thrust_area_id ? taById.get(g.thrust_area_id)?.name : "—"}
                  </Field>
                  <Field label="UoM">{UOM_LABELS[g.uom_type as keyof typeof UOM_LABELS]}</Field>
                  <Field label="Target">
                    {g.uom_type === "timeline"
                      ? g.target_date
                        ? new Date(g.target_date).toLocaleDateString()
                        : "—"
                      : g.uom_type === "zero"
                        ? "0"
                        : g.target ?? "—"}
                  </Field>
                  <Field label="Display order">{g.display_order + 1}</Field>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}
