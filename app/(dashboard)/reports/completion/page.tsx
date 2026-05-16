import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CompletionCharts } from "./completion-charts";
import type {
  Achievement,
  Cycle,
  Goal,
  GoalSheet,
  Profile,
  Quarter,
} from "@/types/database";

export default async function CompletionReportPage() {
  await requireProfile();
  const supabase = await createClient();

  const { data: cycle } = await supabase
    .from("cycles")
    .select("*")
    .eq("is_active", true)
    .single<Cycle>();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "employee");

  const { data: sheets } = cycle
    ? await supabase.from("goal_sheets").select("*").eq("cycle_id", cycle.id)
    : { data: [] as GoalSheet[] };

  const sheetIds = (sheets ?? []).map((s) => s.id);
  const { data: goals } = sheetIds.length
    ? await supabase.from("goals").select("*").in("goal_sheet_id", sheetIds)
    : { data: [] as Goal[] };

  const goalIds = (goals ?? []).map((g) => g.id);
  const { data: achievements } = goalIds.length
    ? await supabase.from("achievements").select("*").in("goal_id", goalIds)
    : { data: [] as Achievement[] };

  // Submission stats
  const totalEmployees = (profiles ?? []).length;
  const submittedEmployees = new Set(
    (sheets ?? []).filter((s) => s.status !== "draft").map((s) => s.employee_id)
  ).size;
  const approvedEmployees = new Set(
    (sheets ?? [])
      .filter((s) => ["approved", "locked"].includes(s.status))
      .map((s) => s.employee_id)
  ).size;
  const draftEmployees = totalEmployees - submittedEmployees;
  const submittedNotApproved = submittedEmployees - approvedEmployees;

  // Quarterly check-in completion
  const QUARTERS: Quarter[] = ["q1", "q2", "q3", "q4"];
  const quarterStats = QUARTERS.map((q) => {
    const employeesWithUpdates = new Set<string>();
    const employeesPending = new Set<string>();

    (sheets ?? [])
      .filter((s) => ["approved", "locked"].includes(s.status))
      .forEach((s) => {
        const sheetGoals = (goals ?? []).filter((g) => g.goal_sheet_id === s.id);
        const hasUpdate = sheetGoals.some((g) =>
          (achievements ?? []).some(
            (a) =>
              a.goal_id === g.id && a.quarter === q && (a.actual_value != null || a.actual_date)
          )
        );
        if (hasUpdate) employeesWithUpdates.add(s.employee_id);
        else employeesPending.add(s.employee_id);
      });

    return {
      quarter: q,
      done: employeesWithUpdates.size,
      pending: employeesPending.size,
    };
  });

  const submissionStages = [
    { stage: "Drafted", count: draftEmployees },
    { stage: "Submitted (pending)", count: submittedNotApproved },
    { stage: "Approved/Locked", count: approvedEmployees },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Completion report"
        description={`${cycle?.name ?? "Active cycle"} · org-wide submission and check-in completion`}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Goal sheet submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <CompletionCharts.SubmissionFunnel data={submissionStages} totalEmployees={totalEmployees} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quarterly check-in completion</CardTitle>
          </CardHeader>
          <CardContent>
            <CompletionCharts.QuarterlyBars data={quarterStats} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Employees who haven't submitted</CardTitle>
        </CardHeader>
        <CardContent>
          <CompletionCharts.PendingList
            profiles={(profiles ?? []) as Profile[]}
            sheets={(sheets ?? []) as GoalSheet[]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
