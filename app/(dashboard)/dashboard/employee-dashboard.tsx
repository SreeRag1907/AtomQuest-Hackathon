import Link from "next/link";
import { Activity, ArrowRight, CheckCircle2, ClipboardList, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GoalStatusBadge } from "@/components/status-badge";
import { CycleBanner } from "@/components/cycle-banner";
import { computeScore } from "@/lib/scoring/compute-score";
import type { Profile, Achievement, Goal, GoalSheet, Cycle, Quarter } from "@/types/database";

export async function EmployeeDashboard({ profile }: { profile: Profile }) {
  const supabase = await createClient();
  const { data: cycle } = await supabase
    .from("cycles")
    .select("*")
    .eq("is_active", true)
    .maybeSingle<Cycle>();

  const { data: sheet } = cycle
    ? await supabase
        .from("goal_sheets")
        .select("*")
        .eq("employee_id", profile.id)
        .eq("cycle_id", cycle.id)
        .maybeSingle<GoalSheet>()
    : { data: null };

  const { data: goals } = sheet
    ? await supabase.from("goals").select("*").eq("goal_sheet_id", sheet.id).order("display_order")
    : { data: [] as Goal[] };

  const goalIds = (goals ?? []).map((g) => g.id);
  const { data: achievements } = goalIds.length
    ? await supabase.from("achievements").select("*").in("goal_id", goalIds)
    : { data: [] as Achievement[] };

  const stats = {
    total: goals?.length ?? 0,
    approved: sheet && ["approved", "locked"].includes(sheet.status) ? goals?.length ?? 0 : 0,
    inProgress:
      (achievements ?? []).filter((a) => a.status === "on_track").length ?? 0,
    completed:
      (achievements ?? []).filter((a) => a.status === "completed").length ?? 0,
  };

  const currentQuarter: Quarter | null =
    cycle && (cycle.current_phase === "q1" || cycle.current_phase === "q2" || cycle.current_phase === "q3")
      ? (cycle.current_phase as Quarter)
      : cycle?.current_phase === "q4_annual"
        ? "q4"
        : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back, {profile.full_name?.split(" ")[0] || "there"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {cycle && <CycleBanner cycle={cycle} />}

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total goals" value={stats.total} icon={ClipboardList} />
        <StatCard label="Approved" value={stats.approved} icon={CheckCircle2} accent="success" />
        <StatCard label="On track" value={stats.inProgress} icon={Activity} accent="success" />
        <StatCard label="Completed" value={stats.completed} icon={TrendingUp} accent="primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* My goal sheet card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">My goal sheet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sheet ? (
              <>
                <GoalStatusBadge status={sheet.status} />
                <div className="text-xs text-muted-foreground">
                  Last updated{" "}
                  {new Date(sheet.updated_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                {sheet.return_reason && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                    <div className="font-medium">Returned</div>
                    <div>{sheet.return_reason}</div>
                  </div>
                )}
                <Button asChild className="w-full">
                  <Link href={`/goals/${sheet.id}`} prefetch={false}>
                    {sheet.status === "draft" || sheet.status === "returned"
                      ? "Continue editing"
                      : "View goal sheet"}
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  You haven't created a goal sheet for this cycle yet.
                </p>
                <Button asChild className="w-full">
                  <Link href="/goals/new">Create goal sheet</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Current quarter progress */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">
              {currentQuarter ? `${currentQuarter.toUpperCase()} progress` : "Quarterly progress"}
            </CardTitle>
            {currentQuarter && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/check-ins">Update <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {!goals || goals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Goals will appear here once your sheet is created.
              </p>
            ) : (
              <ul className="space-y-3">
                {goals.slice(0, 5).map((g) => {
                  const a = (achievements ?? []).find(
                    (x) => x.goal_id === g.id && x.quarter === currentQuarter
                  );
                  const score = currentQuarter
                    ? computeScore(g, a ?? null)
                    : null;
                  return (
                    <li key={g.id} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{g.title}</div>
                        {score != null ? (
                          <Progress
                            value={score}
                            className="mt-1.5 h-1.5"
                            indicatorClassName={
                              score >= 80
                                ? "bg-success"
                                : score >= 50
                                  ? "bg-warning"
                                  : "bg-primary"
                            }
                          />
                        ) : (
                          <div className="mt-1.5 h-1.5 rounded-full bg-muted" />
                        )}
                      </div>
                      <div className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                        {score == null ? "—" : `${Math.round(score)}%`}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent = "primary",
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "success" | "warning";
}) {
  const colors: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
  };
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
