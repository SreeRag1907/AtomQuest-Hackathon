import { notFound } from "next/navigation";
import Link from "next/link";
import { History as HistoryIcon, ListPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveCycle } from "@/lib/data/active-cycle";
import { requireRole } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { GoalStatusBadge } from "@/components/status-badge";
import { AuditDrawer } from "@/components/audit-drawer";
import { initials } from "@/lib/utils";
import { ApprovalActions } from "./approval-actions";
import { CheckinReview } from "./checkin-review";
import { GoalsReadOnly } from "./goals-read-only";
import { GoalsManagerEdit } from "./goals-manager-edit";
import { CheckinReminderButton } from "./checkin-reminder-button";
import { isCheckinPhase, isGoalSettingPhase } from "@/lib/cycle";
import type {
  Achievement,
  CheckinComment,
  Cycle,
  Goal,
  GoalSheet,
  Profile,
  ThrustArea,
} from "@/types/database";

export default async function TeamMemberPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  const me = await requireRole(["manager", "admin"]);
  const supabase = await createClient();

  const [{ data: employee }, cycle] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", employeeId).single<Profile>(),
    getActiveCycle(),
  ]);
  if (!employee) notFound();

  const isAuthorized = me.role === "admin" || employee.manager_id === me.id;
  if (!isAuthorized) notFound();

  const sheetPromise = cycle
    ? supabase
        .from("goal_sheets")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("cycle_id", cycle.id)
        .maybeSingle<GoalSheet>()
    : Promise.resolve({ data: null as GoalSheet | null });

  const { data: thrustAreas } = await supabase.from("thrust_areas").select("*");

  const { data: sheet } = await sheetPromise;

  const goalsPromise = sheet
    ? supabase
        .from("goals")
        .select("*")
        .eq("goal_sheet_id", sheet.id)
        .order("display_order")
    : Promise.resolve({ data: [] as Goal[] });

  const { data: goals } = await goalsPromise;
  const goalIds = (goals ?? []).map((g) => g.id);

  const [achievementsResult, commentsResult] = await Promise.all([
    goalIds.length
      ? supabase.from("achievements").select("*").in("goal_id", goalIds)
      : Promise.resolve({ data: [] as Achievement[] }),
    sheet
      ? supabase
          .from("checkin_comments")
          .select("*")
          .eq("goal_sheet_id", sheet.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as CheckinComment[] }),
  ]);

  const achievements = achievementsResult.data ?? [];
  const comments = commentsResult.data ?? [];

  const assignGoalsOpen =
    !!cycle && isGoalSettingPhase(cycle.current_phase);

  return (
    <div className="space-y-6">
      <PageHeader
        title={employee.full_name}
        description={`${employee.department ?? "—"} · Reports to: ${
          employee.manager_id === me.id ? "You" : "—"
        }`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {assignGoalsOpen &&
              (!sheet || ["draft", "returned"].includes(sheet.status)) && (
                <Button asChild size="sm">
                  <Link href={`/team/${employeeId}/assign-goals`}>
                    <ListPlus className="h-4 w-4" />
                    Assign goals
                  </Link>
                </Button>
              )}
            {sheet ? (
            <div className="flex items-center gap-2">
              {cycle &&
                isCheckinPhase(cycle.current_phase) &&
                ["approved", "locked"].includes(sheet.status) && (
                  <CheckinReminderButton
                    employeeId={employee.id}
                    employeeName={employee.full_name}
                  />
                )}
              <AuditDrawer
                entityType={["goal_sheets", "goals", "achievements"]}
                entityIds={[sheet.id, ...(goals ?? []).map((g) => g.id)]}
                trigger={
                  <Button variant="outline" size="sm">
                    <HistoryIcon className="h-4 w-4" /> Audit history
                  </Button>
                }
              />
            </div>
            ) : null}
          </div>
        }
      />

      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback>{initials(employee.full_name)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="text-sm font-semibold">{employee.full_name}</div>
            <div className="text-xs text-muted-foreground">{employee.email}</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="muted">{employee.department}</Badge>
            <Badge variant="secondary">{employee.role}</Badge>
            {sheet && <GoalStatusBadge status={sheet.status} />}
          </div>
        </CardContent>
      </Card>

      {!sheet ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center text-sm text-muted-foreground">
            <p>
              {assignGoalsOpen
                ? `${employee.full_name} has no goal sheet for this cycle yet. You can create one and assign goals, or they can start from My goals.`
                : `${employee.full_name} hasn't created a goal sheet for this cycle yet.`}
            </p>
            {assignGoalsOpen ? (
              <Button asChild>
                <Link href={`/team/${employeeId}/assign-goals`}>
                  <ListPlus className="h-4 w-4" />
                  Create & assign goals
                </Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="goals">
          <TabsList>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="checkins">Check-ins</TabsTrigger>
          </TabsList>

          <TabsContent value="goals" className="space-y-4">
            {sheet.status === "submitted" && (
              <ApprovalActions sheetId={sheet.id} employeeName={employee.full_name} />
            )}
            {sheet.status === "submitted" ? (
              <GoalsManagerEdit
                sheetId={sheet.id}
                goals={(goals ?? []) as Goal[]}
                thrustAreas={(thrustAreas ?? []) as ThrustArea[]}
              />
            ) : (
              <div className="space-y-4">
                {assignGoalsOpen && (
                  <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                    <span className="font-medium text-foreground">Draft sheet.</span>{" "}
                    <span className="text-muted-foreground">
                      Assign or edit goals here, then your team member submits from{" "}
                      <strong className="text-foreground">My goals</strong>.
                    </span>{" "}
                    <Button asChild variant="link" className="h-auto p-0 text-primary">
                      <Link href={`/team/${employeeId}/assign-goals`}>Open assign page</Link>
                    </Button>
                  </div>
                )}
                <GoalsReadOnly
                  goals={(goals ?? []) as Goal[]}
                  thrustAreas={(thrustAreas ?? []) as ThrustArea[]}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="checkins">
            <CheckinReview
              sheetId={sheet.id}
              goals={(goals ?? []) as Goal[]}
              achievements={(achievements ?? []) as Achievement[]}
              comments={(comments ?? []) as CheckinComment[]}
              currentManagerId={me.id}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
