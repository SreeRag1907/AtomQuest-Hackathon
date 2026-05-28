import Link from "next/link";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveCycle } from "@/lib/data/active-cycle";
import { fetchGoalSheetBundle } from "@/lib/data/sheet-bundle";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { CycleBanner } from "@/components/cycle-banner";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { GoalStatusBadge } from "@/components/status-badge";
import { computeSheetScore } from "@/lib/scoring";
import { quarterFromPhase } from "@/lib/cycle";
import { initials } from "@/lib/utils";
import type {
  Achievement,
  Cycle,
  Goal,
  GoalSheet,
  Profile,
} from "@/types/database";

export default async function TeamPage() {
  const me = await requireRole(["manager", "admin"]);
  const supabase = await createClient();

  const teamQuery = supabase
    .from("profiles")
    .select("*")
    .eq("is_active", true)
    .order("full_name");

  const [cycle, { data: team }] = await Promise.all([
    getActiveCycle(),
    me.role === "admin"
      ? teamQuery.eq("role", "employee")
      : teamQuery.eq("manager_id", me.id),
  ]);

  const teamIds = new Set((team ?? []).map((t) => t.id));
  const bundle = await fetchGoalSheetBundle(supabase, cycle?.id);
  const sheets = bundle.sheets.filter((s) => teamIds.has(s.employee_id));
  const goals = bundle.goals.filter((g) => sheets.some((s) => s.id === g.goal_sheet_id));
  const quarter = cycle ? quarterFromPhase(cycle.current_phase) : null;
  const achievements = quarter
    ? bundle.achievements.filter(
        (a) => a.quarter === quarter && goals.some((g) => g.id === a.goal_id)
      )
    : [];

  const pendingCount = (sheets ?? []).filter((s) => s.status === "submitted").length;

  if (!team || team.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Team" />
        {cycle ? <CycleBanner cycle={cycle} /> : null}
        <EmptyState
          icon={Users}
          title={me.role === "admin" ? "No employees yet" : "No direct reports"}
          description={
            me.role === "admin"
              ? "Add users from the admin section."
              : "When team members are assigned to you, they'll appear here."
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {cycle ? <CycleBanner cycle={cycle} /> : null}
      <PageHeader
        title="Team"
        description={`${team.length} member${team.length === 1 ? "" : "s"}${
          quarter ? ` · current quarter: ${quarter.toUpperCase()}` : ""
        }`}
        actions={
          pendingCount > 0 ? (
            <Button asChild>
              <Link href="/team/approvals">
                {pendingCount} pending{" "}
                <Badge variant="secondary" className="ml-2">
                  Review
                </Badge>
              </Link>
            </Button>
          ) : null
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {team.map((member) => {
          const sheet = (sheets ?? []).find((s) => s.employee_id === member.id);
          const memberGoals = (goals ?? []).filter((g) => g.goal_sheet_id === sheet?.id);
          const memberAchievements = (achievements ?? []).filter((a) =>
            memberGoals.some((g) => g.id === a.goal_id)
          );
          const score = computeSheetScore(memberGoals, memberAchievements);
          return (
            <Card key={member.id} className="transition-shadow hover:shadow-md">
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{initials(member.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{member.full_name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {member.department ?? "—"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {sheet ? (
                    <GoalStatusBadge status={sheet.status} />
                  ) : (
                    <Badge variant="muted">No sheet</Badge>
                  )}
                </div>
                {quarter && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{quarter.toUpperCase()} progress</span>
                      <span className="font-medium tabular-nums">
                        {score == null ? "—" : `${Math.round(score)}%`}
                      </span>
                    </div>
                    <Progress
                      value={score ?? 0}
                      className="h-1.5"
                      indicatorClassName={
                        score && score >= 80
                          ? "bg-success"
                          : score && score >= 50
                            ? "bg-warning"
                            : "bg-primary"
                      }
                    />
                  </div>
                )}
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/team/${member.id}`} prefetch={false}>
                    View details
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
