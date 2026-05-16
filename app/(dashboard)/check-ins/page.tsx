import { CalendarClock, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { quarterFromPhase, phaseLabel, phaseCloseDate } from "@/lib/cycle";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { CycleBanner } from "@/components/cycle-banner";
import { CheckinForm } from "./checkin-form";
import type {
  Achievement,
  Cycle,
  Goal,
  GoalSheet,
  ThrustArea,
} from "@/types/database";

export default async function CheckinsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: cycle } = await supabase
    .from("cycles")
    .select("*")
    .eq("is_active", true)
    .single<Cycle>();

  if (!cycle) {
    return (
      <div className="space-y-6">
        <PageHeader title="Check-ins" />
        <EmptyState
          icon={Lock}
          title="No active cycle"
          description="Your administrator hasn't started a cycle yet."
        />
      </div>
    );
  }

  const quarter = quarterFromPhase(cycle.current_phase);
  const closes = phaseCloseDate(cycle);

  const { data: sheet } = await supabase
    .from("goal_sheets")
    .select("*")
    .eq("employee_id", profile.id)
    .eq("cycle_id", cycle.id)
    .maybeSingle<GoalSheet>();

  if (!sheet) {
    return (
      <div className="space-y-6">
        <PageHeader title="Check-ins" />
        <CycleBanner cycle={cycle} />
        <EmptyState
          icon={Lock}
          title="No goal sheet for this cycle"
          description="Create your goal sheet first, then come back to track achievements."
        />
      </div>
    );
  }

  if (!["approved", "locked"].includes(sheet.status)) {
    return (
      <div className="space-y-6">
        <PageHeader title="Check-ins" />
        <CycleBanner cycle={cycle} />
        <EmptyState
          icon={Lock}
          title="Goal sheet not approved yet"
          description={`Your sheet is currently ${sheet.status}. Achievements can be tracked once approved.`}
        />
      </div>
    );
  }

  if (!quarter) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Check-ins"
          description={`${cycle.name} · ${phaseLabel(cycle.current_phase)}`}
        />
        <CycleBanner cycle={cycle} />
        <EmptyState
          icon={CalendarClock}
          title="Check-in window isn't open"
          description={`Current phase: ${phaseLabel(cycle.current_phase)}. Check-ins are only available during Q1–Q4.`}
        />
      </div>
    );
  }

  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("goal_sheet_id", sheet.id)
    .order("display_order");

  const goalIds = (goals ?? []).map((g) => g.id);
  const { data: achievements } = goalIds.length
    ? await supabase.from("achievements").select("*").in("goal_id", goalIds)
    : { data: [] as Achievement[] };

  const { data: thrustAreas } = await supabase
    .from("thrust_areas")
    .select("*");

  // Resolve parent-owner names for any child goals on this sheet
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${quarter.toUpperCase()} check-in`}
        description={
          closes ? `Window closes ${new Date(closes).toLocaleDateString()}` : undefined
        }
      />
      <CycleBanner cycle={cycle} />
      <CheckinForm
        sheetId={sheet.id}
        quarter={quarter}
        goals={(goals ?? []) as Goal[]}
        achievements={(achievements ?? []) as Achievement[]}
        thrustAreas={(thrustAreas ?? []) as ThrustArea[]}
        parentOwnerByGoalId={parentOwnerByGoalId}
      />
    </div>
  );
}
