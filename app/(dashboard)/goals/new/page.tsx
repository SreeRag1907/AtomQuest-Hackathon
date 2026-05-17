import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isGoalSettingPhase, phaseLabel } from "@/lib/cycle";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { GoalSheetForm } from "@/components/goals/goal-sheet-form";
import { ensureMyDraftGoalSheet } from "@/app/(dashboard)/goals/actions";
import type { Cycle, Goal, GoalSheet, ThrustArea } from "@/types/database";

export default async function NewGoalSheetPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: cycle } = await supabase
    .from("cycles")
    .select("*")
    .eq("is_active", true)
    .single<Cycle>();

  if (!cycle) {
    return (
      <EmptyState
        icon={Lock}
        title="No active cycle"
        description="Your admin hasn't started a goal-setting cycle yet."
      />
    );
  }

  if (!isGoalSettingPhase(cycle.current_phase)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Create goal sheet" />
        <EmptyState
          icon={Lock}
          title="Goal-setting window is closed"
          description={`The current phase is ${phaseLabel(cycle.current_phase)}. New goals can only be created during the goal-setting phase.`}
        />
      </div>
    );
  }

  const { data: existingSheet } = await supabase
    .from("goal_sheets")
    .select("*")
    .eq("employee_id", profile.id)
    .eq("cycle_id", cycle.id)
    .maybeSingle<GoalSheet>();

  let sheetId = existingSheet?.id;
  let goals: Goal[] = [];
  let isReturned = false;
  let returnReason: string | null = null;

  if (!sheetId) {
    const result = await ensureMyDraftGoalSheet();
    if (!result.ok || !result.data) {
      return (
        <EmptyState
          icon={Lock}
          title="Failed to create sheet"
          description={result.error ?? "Try again"}
        />
      );
    }
    sheetId = result.data.id;
  } else if (!["draft", "returned"].includes(existingSheet!.status)) {
    redirect(`/goals/${sheetId}`);
  } else {
    isReturned = existingSheet!.status === "returned";
    returnReason = existingSheet!.return_reason;
    const { data } = await supabase
      .from("goals")
      .select("*")
      .eq("goal_sheet_id", sheetId)
      .order("display_order");
    goals = (data ?? []) as Goal[];
  }

  const { data: thrustAreas } = await supabase
    .from("thrust_areas")
    .select("*")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Create your goal sheet — ${cycle.name}`}
        description="Add up to 8 goals. Total weightage must equal 100%."
      />
      <GoalSheetForm
        sheetId={sheetId!}
        initialGoals={goals}
        thrustAreas={(thrustAreas ?? []) as ThrustArea[]}
        isReturned={isReturned}
        returnReason={returnReason}
      />
    </div>
  );
}
