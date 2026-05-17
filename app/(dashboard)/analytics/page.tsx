import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeScore } from "@/lib/scoring";
import {
  KpiCard,
  QoqTrend,
  Donut,
  UomBars,
  StackedStatus,
  Heatmap,
  ManagerEffectiveness,
} from "./analytics-charts";
import { EmployeeDrilldown } from "./employee-drilldown";
import { UOM_LABELS } from "@/lib/validations/goal";
import type {
  Achievement,
  Cycle,
  Goal,
  GoalSheet,
  Profile,
  Quarter,
  ThrustArea,
} from "@/types/database";

const QUARTERS: Quarter[] = ["q1", "q2", "q3", "q4"];

export default async function AnalyticsPage() {
  await requireProfile();
  const supabase = await createClient();

  const { data: cycle } = await supabase
    .from("cycles")
    .select("*")
    .eq("is_active", true)
    .single<Cycle>();

  const { data: profiles } = await supabase.from("profiles").select("*");
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
  const { data: thrustAreas } = await supabase.from("thrust_areas").select("*");

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const sheetByEmpId = new Map((sheets ?? []).map((s) => [s.employee_id, s]));

  // Section 1: Org KPIs + QoQ
  const allScores: number[] = [];
  const onTrackCount = (achievements ?? []).filter((a) => a.status === "on_track").length;
  const completedCount = (achievements ?? []).filter((a) => a.status === "completed").length;
  const atRiskCount = (achievements ?? []).filter((a) => {
    const g = (goals ?? []).find((x) => x.id === a.goal_id);
    if (!g) return false;
    const score = computeScore(g, a);
    return score != null && score < 50;
  }).length;
  (goals ?? []).forEach((g) => {
    QUARTERS.forEach((q) => {
      const a = (achievements ?? []).find((x) => x.goal_id === g.id && x.quarter === q);
      const s = computeScore(g, a ?? null);
      if (s != null) allScores.push(s);
    });
  });
  const avgScoreRaw =
    allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : null;
  const avgScore = avgScoreRaw;
  const onTrackPct = (achievements ?? []).length
    ? Math.round(((onTrackCount + completedCount) / (achievements ?? []).length) * 100)
    : 0;

  const qoq = QUARTERS.map((q) => {
    const scores: number[] = [];
    (goals ?? []).forEach((g) => {
      const a = (achievements ?? []).find((x) => x.goal_id === g.id && x.quarter === q);
      const s = computeScore(g, a ?? null);
      if (s != null) scores.push(s);
    });
    return {
      quarter: q.toUpperCase(),
      avg: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    };
  });

  // Section 2: Distributions
  const taById = new Map((thrustAreas ?? []).map((t) => [t.id, t]));
  const thrustDist = Array.from(taById.values()).map((t) => ({
    name: t.name,
    value: (goals ?? []).filter((g) => g.thrust_area_id === t.id).length,
  })).filter((d) => d.value > 0);
  const uomDist = Object.entries(
    (goals ?? []).reduce<Record<string, number>>((acc, g) => {
      acc[g.uom_type] = (acc[g.uom_type] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([k, v]) => ({ name: UOM_LABELS[k as keyof typeof UOM_LABELS] ?? k, value: v }));

  const departments = Array.from(
    new Set((profiles ?? []).map((p) => p.department).filter(Boolean) as string[])
  );
  const statusByDept = departments.map((d) => {
    const counts = { department: d, draft: 0, submitted: 0, approved: 0, locked: 0, returned: 0 };
    (profiles ?? [])
      .filter((p) => p.department === d)
      .forEach((p) => {
        const s = sheetByEmpId.get(p.id);
        if (s) {
          const key = s.status as "draft" | "submitted" | "approved" | "locked" | "returned";
          if (key in counts) counts[key]++;
        }
      });
    return counts;
  });

  // Section 3: Heatmap (rows = department, cols = quarters, value = avg score)
  const heatmap = departments.map((d) => {
    const cells = QUARTERS.map((q) => {
      const scores: number[] = [];
      (profiles ?? [])
        .filter((p) => p.department === d)
        .forEach((p) => {
          const s = sheetByEmpId.get(p.id);
          if (!s) return;
          const sheetGoals = (goals ?? []).filter((g) => g.goal_sheet_id === s.id);
          sheetGoals.forEach((g) => {
            const a = (achievements ?? []).find(
              (x) => x.goal_id === g.id && x.quarter === q
            );
            const score = computeScore(g, a ?? null);
            if (score != null) scores.push(score);
          });
        });
      return {
        quarter: q.toUpperCase(),
        score: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
      };
    });
    return { department: d, cells };
  });

  // Section 4: Manager effectiveness
  const managers = (profiles ?? []).filter((p) => p.role === "manager");
  const managerStats = managers.map((m) => {
    const reports = (profiles ?? []).filter((p) => p.manager_id === m.id);
    const reportSheets = reports
      .map((r) => sheetByEmpId.get(r.id))
      .filter(Boolean) as GoalSheet[];
    const checkinDoneCount = reportSheets.filter((s) => {
      const sheetGoals = (goals ?? []).filter((g) => g.goal_sheet_id === s.id);
      return sheetGoals.some((g) =>
        (achievements ?? []).some(
          (a) => a.goal_id === g.id && (a.actual_value != null || a.actual_date != null)
        )
      );
    }).length;
    const teamScores: number[] = [];
    reportSheets.forEach((s) => {
      const sheetGoals = (goals ?? []).filter((g) => g.goal_sheet_id === s.id);
      sheetGoals.forEach((g) => {
        QUARTERS.forEach((q) => {
          const a = (achievements ?? []).find(
            (x) => x.goal_id === g.id && x.quarter === q
          );
          const score = computeScore(g, a ?? null);
          if (score != null) teamScores.push(score);
        });
      });
    });
    return {
      manager: m,
      teamSize: reports.length,
      checkinRate:
        reports.length > 0 ? Math.round((checkinDoneCount / reports.length) * 100) : 0,
      avgScore:
        teamScores.length > 0
          ? teamScores.reduce((a, b) => a + b, 0) / teamScores.length
          : 0,
    };
  });

  // Section 5: Drill-down employee data (passed to client component)
  const employeeData = (profiles ?? [])
    .filter((p) => p.role === "employee")
    .map((p) => {
      const s = sheetByEmpId.get(p.id);
      const sGoals = s ? (goals ?? []).filter((g) => g.goal_sheet_id === s.id) : [];
      const sAchievements = s ? (achievements ?? []).filter((a) => sGoals.some((g) => g.id === a.goal_id)) : [];
      const trend = QUARTERS.map((q) => {
        const scores: number[] = [];
        sGoals.forEach((g) => {
          const a = sAchievements.find((x) => x.goal_id === g.id && x.quarter === q);
          const score = computeScore(g, a ?? null);
          if (score != null) scores.push(score);
        });
        return {
          quarter: q.toUpperCase(),
          score: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
        };
      });
      return {
        profile: p,
        trend,
        goals: sGoals.map((g) => {
          const qScores = QUARTERS.map((q) => {
            const a = sAchievements.find((x) => x.goal_id === g.id && x.quarter === q);
            return { quarter: q, score: computeScore(g, a ?? null) };
          });
          return { goal: g, qScores };
        }),
      };
    });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description={`${cycle?.name ?? "Active cycle"} · org-wide insights`}
      />

      {/* Section 1: Organization Overview */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Organization overview
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label="Avg achievement score" value={avgScore != null ? `${Math.round(avgScore)}%` : "—"} accent="primary" />
          <KpiCard label="On-track / completed" value={`${onTrackPct}%`} accent="success" />
          <KpiCard label="At-risk goals" value={atRiskCount} accent="warning" />
          <KpiCard label="Total goals" value={(goals ?? []).length} accent="primary" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quarter-over-quarter trend</CardTitle>
          </CardHeader>
          <CardContent>
            <QoqTrend data={qoq} />
          </CardContent>
        </Card>
      </section>

      {/* Section 2: Goal Distribution */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Goal distribution
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">By thrust area</CardTitle>
            </CardHeader>
            <CardContent>
              <Donut data={thrustDist} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">By UoM type</CardTitle>
            </CardHeader>
            <CardContent>
              <UomBars data={uomDist} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status by department</CardTitle>
            </CardHeader>
            <CardContent>
              <StackedStatus data={statusByDept} />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section 3: Heatmap */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Department × quarter heatmap
        </h2>
        <Card>
          <CardContent className="p-5">
            <Heatmap data={heatmap} />
          </CardContent>
        </Card>
      </section>

      {/* Section 4: Manager Effectiveness */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Manager effectiveness
        </h2>
        <Card>
          <ManagerEffectiveness data={managerStats} />
        </Card>
      </section>

      {/* Section 5: Drill-down */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Individual drill-down
        </h2>
        <Card>
          <CardContent className="p-5">
            <EmployeeDrilldown employees={employeeData} />
          </CardContent>
        </Card>
      </section>

      {/* Hide unused */}
      <span className="hidden">{profileById.size}</span>
    </div>
  );
}
