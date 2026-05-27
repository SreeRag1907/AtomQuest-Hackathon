import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { AchievementReport } from "./achievement-report";
import type {
  Achievement,
  Cycle,
  Goal,
  GoalSheet,
  Profile,
  ThrustArea,
} from "@/types/database";

export default async function AchievementReportPage({
  searchParams,
}: {
  searchParams: Promise<{ cycleId?: string }>;
}) {
  const me = await requireProfile();
  const supabase = await createClient();
  const { cycleId: cycleIdParam } = await searchParams;

  const { data: cycles } = await supabase
    .from("cycles")
    .select("*")
    .order("created_at", { ascending: false });

  const cyclesList = (cycles ?? []) as Cycle[];

  // Choose the cycle to scope data fetch by: explicit query param, else active.
  const activeCycle = cyclesList.find((c) => c.is_active) ?? null;
  const selectedCycle =
    (cycleIdParam ? cyclesList.find((c) => c.id === cycleIdParam) : null) ?? activeCycle;

  // RLS will scope automatically: employees see own data, managers see reports, admin sees all.
  const { data: sheets } = selectedCycle
    ? await supabase.from("goal_sheets").select("*").eq("cycle_id", selectedCycle.id)
    : { data: [] as GoalSheet[] };
  const sheetIds = (sheets ?? []).map((s) => s.id);
  const employeeIds = [...new Set((sheets ?? []).map((s) => s.employee_id))];

  const [{ data: goals }, { data: achievements }, { data: employees }, { data: thrustAreas }] =
    await Promise.all([
      sheetIds.length
        ? supabase.from("goals").select("*").in("goal_sheet_id", sheetIds)
        : Promise.resolve({ data: [] as Goal[] }),
      sheetIds.length
        ? supabase.from("goals").select("id, achievements:achievements(*)").in("goal_sheet_id", sheetIds)
        : Promise.resolve({ data: [] as { id: string; achievements: Achievement[] }[] }),
      employeeIds.length
        ? supabase.from("profiles").select("*").in("id", employeeIds)
        : Promise.resolve({ data: [] as Profile[] }),
      supabase.from("thrust_areas").select("*"),
    ]);

  // Flatten achievements from the nested join
  const allAchievements: Achievement[] = [];
  (achievements ?? []).forEach((row) => {
    (row as unknown as { achievements: Achievement[] }).achievements?.forEach((a) =>
      allAchievements.push(a)
    );
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Achievement report"
        description={
          me.role === "admin"
            ? "Org-wide achievement breakdown by goal and quarter."
            : me.role === "manager"
              ? "Your team's achievement breakdown."
              : "Your goal achievements."
        }
      />
      <Card>
        <AchievementReport
          cycles={cyclesList}
          activeCycleId={selectedCycle?.id ?? null}
          sheets={(sheets ?? []) as GoalSheet[]}
          goals={(goals ?? []) as Goal[]}
          achievements={allAchievements}
          employees={(employees ?? []) as Profile[]}
          thrustAreas={(thrustAreas ?? []) as ThrustArea[]}
        />
      </Card>
    </div>
  );
}
