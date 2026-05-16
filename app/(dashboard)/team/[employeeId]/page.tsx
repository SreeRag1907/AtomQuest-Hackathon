import { notFound } from "next/navigation";
import { History as HistoryIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
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

  const { data: employee } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", employeeId)
    .single<Profile>();
  if (!employee) notFound();

  const isAuthorized = me.role === "admin" || employee.manager_id === me.id;
  if (!isAuthorized) notFound();

  const { data: cycle } = await supabase
    .from("cycles")
    .select("*")
    .eq("is_active", true)
    .single<Cycle>();

  const { data: sheet } = cycle
    ? await supabase
        .from("goal_sheets")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("cycle_id", cycle.id)
        .maybeSingle<GoalSheet>()
    : { data: null };

  const { data: goals } = sheet
    ? await supabase
        .from("goals")
        .select("*")
        .eq("goal_sheet_id", sheet.id)
        .order("display_order")
    : { data: [] as Goal[] };

  const goalIds = (goals ?? []).map((g) => g.id);
  const { data: achievements } = goalIds.length
    ? await supabase.from("achievements").select("*").in("goal_id", goalIds)
    : { data: [] as Achievement[] };

  const { data: comments } = sheet
    ? await supabase
        .from("checkin_comments")
        .select("*")
        .eq("goal_sheet_id", sheet.id)
        .order("created_at", { ascending: false })
    : { data: [] as CheckinComment[] };

  const { data: thrustAreas } = await supabase
    .from("thrust_areas")
    .select("*");

  return (
    <div className="space-y-6">
      <PageHeader
        title={employee.full_name}
        description={`${employee.department ?? "—"} · Reports to: ${
          employee.manager_id === me.id ? "You" : "—"
        }`}
        actions={
          sheet ? (
            <AuditDrawer
              entityType={["goal_sheets", "goals", "achievements"]}
              entityIds={[sheet.id, ...(goals ?? []).map((g) => g.id)]}
              trigger={
                <Button variant="outline" size="sm">
                  <HistoryIcon className="h-4 w-4" /> Audit history
                </Button>
              }
            />
          ) : null
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
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {employee.full_name} hasn't created a goal sheet for this cycle yet.
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
            <GoalsReadOnly
              goals={(goals ?? []) as Goal[]}
              thrustAreas={(thrustAreas ?? []) as ThrustArea[]}
            />
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
