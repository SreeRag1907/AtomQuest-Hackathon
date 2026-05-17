import Link from "next/link";
import { ArrowRight, ClipboardCheck, ClipboardList, Users, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CycleBanner } from "@/components/cycle-banner";
import { GoalStatusBadge } from "@/components/status-badge";
import { computeSheetScore } from "@/lib/scoring";
import { quarterFromPhase } from "@/lib/cycle";
import type { Profile, GoalSheet, Cycle, Goal, Achievement } from "@/types/database";

export async function ManagerDashboard({ profile }: { profile: Profile }) {
  const supabase = await createClient();
  const { data: cycle } = await supabase
    .from("cycles")
    .select("*")
    .eq("is_active", true)
    .maybeSingle<Cycle>();

  const { data: team } = await supabase
    .from("profiles")
    .select("*")
    .eq("manager_id", profile.id);

  const teamIds = (team ?? []).map((t) => t.id);
  const { data: sheets } = teamIds.length && cycle
    ? await supabase
        .from("goal_sheets")
        .select("*")
        .eq("cycle_id", cycle.id)
        .in("employee_id", teamIds)
    : { data: [] as GoalSheet[] };

  const sheetIds = (sheets ?? []).map((s) => s.id);
  const { data: goals } = sheetIds.length
    ? await supabase.from("goals").select("*").in("goal_sheet_id", sheetIds)
    : { data: [] as Goal[] };

  const goalIds = (goals ?? []).map((g) => g.id);
  const quarter = cycle ? quarterFromPhase(cycle.current_phase) : null;
  const { data: achievements } = goalIds.length && quarter
    ? await supabase
        .from("achievements")
        .select("*")
        .in("goal_id", goalIds)
        .eq("quarter", quarter)
    : { data: [] as Achievement[] };

  const pending = (sheets ?? []).filter((s) => s.status === "submitted").length;
  const approvedCount = (sheets ?? []).filter((s) => ["approved", "locked"].includes(s.status)).length;

  const memberRows = (team ?? []).map((m) => {
    const sheet = (sheets ?? []).find((s) => s.employee_id === m.id);
    const memberGoals = (goals ?? []).filter((g) => g.goal_sheet_id === sheet?.id);
    const memberAchievements = (achievements ?? []).filter((a) =>
      memberGoals.some((g) => g.id === a.goal_id)
    );
    const score = computeSheetScore(memberGoals, memberAchievements);
    return { member: m, sheet, score };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Hello, {profile.full_name?.split(" ")[0] || "there"}
        </h1>
        <p className="text-sm text-muted-foreground">Manager view · {team?.length ?? 0} direct reports</p>
      </div>

      {cycle && <CycleBanner cycle={cycle} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Team size" value={team?.length ?? 0} icon={Users} />
        <StatCard label="Pending approvals" value={pending} icon={ClipboardList} accent="warning" />
        <StatCard label="Approved sheets" value={approvedCount} icon={ClipboardCheck} accent="success" />
        <StatCard label="Active cycle" value={cycle?.name ?? "—"} icon={MessageSquare} stringValue />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Pending actions</CardTitle>
            {pending > 0 && (
              <Button asChild size="sm" variant="ghost">
                <Link href="/team/approvals">
                  Review <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            {pending === 0 && (team?.length ?? 0) > 0 && (
              <p className="text-sm text-muted-foreground">No pending submissions — all caught up.</p>
            )}
            {(team?.length ?? 0) === 0 && (
              <p className="text-sm text-muted-foreground">No direct reports assigned yet.</p>
            )}
            {(sheets ?? [])
              .filter((s) => s.status === "submitted")
              .map((s, idx) => {
                const m = (team ?? []).find((t) => t.id === s.employee_id);
                return (
                  <Link
                    key={s.id}
                    href={`/team/${s.employee_id}`}
                    className="flex items-center justify-between rounded-md border p-3 text-sm transition-colors hover:bg-accent"
                  >
                    <div>
                      <div className="font-medium">{idx + 1}. {m?.full_name}</div>
                      <div className="text-xs text-muted-foreground">
                        Submitted{" "}
                        {s.submitted_at
                          ? new Date(s.submitted_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })
                          : ""}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                );
              })}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Team progress</CardTitle>
          </CardHeader>
          <CardContent>
            {memberRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No direct reports.</p>
            ) : (
              <ul className="space-y-3">
                {memberRows.map((row) => (
                  <li key={row.member.id} className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="truncate font-medium">{row.member.full_name}</span>
                        {row.sheet && <GoalStatusBadge status={row.sheet.status} />}
                      </div>
                      {row.score != null ? (
                        <Progress
                          value={row.score}
                          className="mt-1.5 h-1.5"
                          indicatorClassName={
                            row.score >= 80
                              ? "bg-success"
                              : row.score >= 50
                                ? "bg-warning"
                                : "bg-primary"
                          }
                        />
                      ) : (
                        <div className="mt-1.5 h-1.5 rounded-full bg-muted" />
                      )}
                    </div>
                    <div className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                      {row.score == null ? "—" : `${Math.round(row.score)}%`}
                    </div>
                  </li>
                ))}
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
  stringValue,
}: {
  label: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "success" | "warning";
  stringValue?: boolean;
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
          <div className={`mt-1 ${stringValue ? "text-base font-semibold" : "text-2xl font-semibold tabular-nums"}`}>
            {value}
          </div>
        </div>
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${colors[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}
