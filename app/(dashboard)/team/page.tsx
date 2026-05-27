import Link from "next/link";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
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

  const { data: cycle } = await supabase
    .from("cycles")
    .select("*")
    .eq("is_active", true)
    .maybeSingle<Cycle>();

  // Active employees only — deactivated team members shouldn't clutter the roster.
  const teamQuery = supabase
    .from("profiles")
    .select("*")
    .eq("is_active", true)
    .order("full_name");
  const { data: team } =
    me.role === "admin"
      ? await teamQuery.eq("role", "employee")
      : await teamQuery.eq("manager_id", me.id);

  const teamIds = (team ?? []).map((t) => t.id);
  const { data: sheets } =
    cycle && teamIds.length
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
  const { data: achievements } =
    goalIds.length && quarter
      ? await supabase
          .from("achievements")
          .select("*")
          .in("goal_id", goalIds)
          .eq("quarter", quarter)
      : { data: [] as Achievement[] };

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
                  <Link href={`/team/${member.id}`}>View details</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
