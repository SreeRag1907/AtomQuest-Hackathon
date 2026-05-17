import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { isGoalSettingPhase, phaseLabel } from "@/lib/cycle";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { GoalSheetForm } from "@/components/goals/goal-sheet-form";
import {
  managerCreateGoalSheetForEmployee,
  managerSaveEmployeeDraft,
} from "@/app/(dashboard)/team/actions";
import type { Cycle, Goal, GoalSheet, Profile, ThrustArea } from "@/types/database";

export default async function ManagerAssignGoalsPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  const me = await requireRole(["manager", "admin"]);
  const supabase = await createClient();

  const { data: employee } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", employeeId)
    .single<Profile>();
  if (!employee) notFound();

  const isAuthorized = me.role === "admin" || employee.manager_id === me.id;
  if (!isAuthorized) notFound();

  const { data: cycle } = await supabase
    .from("cycles")
    .select("*")
    .eq("is_active", true)
    .maybeSingle<Cycle>();

  if (!cycle) {
    return (
      <div className="space-y-6">
        <PageHeader title="Assign goals" />
        <EmptyState
          icon={Lock}
          title="No active cycle"
          description="An administrator needs to activate a cycle before you can assign goals."
        />
      </div>
    );
  }

  if (!isGoalSettingPhase(cycle.current_phase)) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Assign goals — ${employee.full_name}`} />
        <EmptyState
          icon={Lock}
          title="Goal-setting is closed"
          description={`The cycle is in ${phaseLabel(cycle.current_phase)}. Goals can only be assigned during the goal-setting phase.`}
          action={
            <Button asChild variant="outline">
              <Link href={`/team/${employeeId}`}>Back to profile</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const created = await managerCreateGoalSheetForEmployee(employeeId);
  if (!created.ok || !created.sheetId) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Assign goals — ${employee.full_name}`} />
        <EmptyState
          icon={Lock}
          title="Cannot open assign flow"
          description={created.error ?? "Unknown error"}
          action={
            <Button asChild variant="outline">
              <Link href={`/team/${employeeId}`}>Back to profile</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const sheetId = created.sheetId;
  const { data: sheet } = await supabase
    .from("goal_sheets")
    .select("*")
    .eq("id", sheetId)
    .single<GoalSheet>();

  if (!sheet || !["draft", "returned"].includes(sheet.status)) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Assign goals — ${employee.full_name}`} />
        <EmptyState
          icon={Lock}
          title="Sheet is not editable"
          description="This goal sheet has already been submitted or finalized. Use the team profile to review or approve."
          action={
            <Button asChild variant="outline">
              <Link href={`/team/${employeeId}`}>Back to profile</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("goal_sheet_id", sheetId)
    .order("display_order");

  const { data: thrustAreas } = await supabase
    .from("thrust_areas")
    .select("*")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Assign goals — ${employee.full_name}`}
        description={`${cycle.name} · Draft on their behalf; they submit for approval from My goals.`}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/team/${employeeId}`}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to profile
            </Link>
          </Button>
        }
      />

      <GoalSheetForm
        sheetId={sheetId}
        initialGoals={(goals ?? []) as Goal[]}
        thrustAreas={(thrustAreas ?? []) as ThrustArea[]}
        isReturned={sheet.status === "returned"}
        returnReason={sheet.return_reason}
        canShare={false}
        saveDraftAction={managerSaveEmployeeDraft}
        hideSubmit
        assignHint="You are editing this employee’s draft sheet. After you save, they should open My goals → Continue editing, review, and submit for your approval."
      />
    </div>
  );
}
