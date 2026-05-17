import Link from "next/link";
import { CheckSquare, ClipboardList, FileEdit, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { GoalStatusBadge } from "@/components/status-badge";
import { CycleBanner } from "@/components/cycle-banner";
import { isCheckinPhase, isGoalSettingPhase, phaseLabel } from "@/lib/cycle";
import { UOM_LABELS } from "@/lib/validations/goal";
import type { Cycle, GoalSheet, Goal, ThrustArea } from "@/types/database";

export default async function GoalsListPage() {
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
        <PageHeader title="My goals" />
        <EmptyState
          icon={ClipboardList}
          title="No active cycle"
          description="Your administrator hasn't started a goal-setting cycle yet."
        />
      </div>
    );
  }

  const { data: sheet } = await supabase
    .from("goal_sheets")
    .select("*")
    .eq("employee_id", profile.id)
    .eq("cycle_id", cycle.id)
    .maybeSingle<GoalSheet>();

  const { data: goals } = sheet
    ? await supabase
        .from("goals")
        .select("*")
        .eq("goal_sheet_id", sheet.id)
        .order("display_order")
    : { data: [] as Goal[] };

  const { data: thrustAreas } = await supabase
    .from("thrust_areas")
    .select("*");

  const taById = new Map(
    (thrustAreas ?? ([] as ThrustArea[])).map((t) => [t.id, t])
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="My goals"
        description={`${cycle.name} · ${phaseLabel(cycle.current_phase)}`}
        actions={
          !sheet && isGoalSettingPhase(cycle.current_phase) ? (
            <Button asChild>
              <Link href="/goals/new">
                <Plus className="h-4 w-4" />
                Create goal sheet
              </Link>
            </Button>
          ) : null
        }
      />

      <CycleBanner cycle={cycle} />

      {!sheet ? (
        isGoalSettingPhase(cycle.current_phase) ? (
          <EmptyState
            icon={ClipboardList}
            title="Create your goal sheet"
            description={`The goal-setting window is open for ${cycle.name}. Create a sheet with up to 8 goals totaling 100% weightage.`}
            action={
              <Button asChild>
                <Link href="/goals/new">
                  <Plus className="h-4 w-4" /> Create goal sheet
                </Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={ClipboardList}
            title="Goal-setting window is closed"
            description={`The current phase is ${phaseLabel(cycle.current_phase)}.${
              isCheckinPhase(cycle.current_phase)
                ? " Use Check-ins to record your quarterly progress."
                : " Contact your admin if you need to set goals."
            }`}
            action={
              isCheckinPhase(cycle.current_phase) ? (
                <Button asChild>
                  <Link href="/check-ins">
                    <CheckSquare className="h-4 w-4" />
                    Go to Check-ins
                  </Link>
                </Button>
              ) : undefined
            }
          />
        )
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <GoalStatusBadge status={sheet.status} />
                <div className="text-sm text-muted-foreground">
                  {sheet.submitted_at && (
                    <>Submitted {new Date(sheet.submitted_at).toLocaleDateString()}</>
                  )}
                  {sheet.locked_at && (
                    <> · Finalized {new Date(sheet.locked_at).toLocaleDateString()}</>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {["locked", "approved"].includes(sheet.status) && isCheckinPhase(cycle.current_phase) && (
                  <Button asChild size="sm">
                    <Link href="/check-ins">
                      <CheckSquare className="h-4 w-4" />
                      Go to Check-ins
                    </Link>
                  </Button>
                )}
                <Button asChild variant="outline" size="sm">
                  <Link href={`/goals/${sheet.id}`}>
                    <FileEdit className="h-4 w-4" />
                    {["draft", "returned"].includes(sheet.status)
                      ? "Continue editing"
                      : "View goals"}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Info callout when goals are finalized and check-ins are open */}
          {["locked", "approved"].includes(sheet.status) && isCheckinPhase(cycle.current_phase) && (
            <div className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/5 p-4">
              <CheckSquare className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium text-primary">
                  Your goals are finalized — time to track progress
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  The goal-setting window is closed. During{" "}
                  <span className="font-medium">{phaseLabel(cycle.current_phase)}</span> you
                  record your actual achievements in{" "}
                  <Link href="/check-ins" className="font-medium text-primary underline-offset-2 hover:underline">
                    Check-ins
                  </Link>
                  . Your goal list is read-only until the next cycle opens.
                </p>
              </div>
            </div>
          )}

          {goals && goals.length === 0 && (
            <div className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
              No goals on this sheet yet.{" "}
              {["draft", "returned"].includes(sheet.status) && (
                <Link href={`/goals/${sheet.id}`} className="text-primary hover:underline">
                  Start adding goals →
                </Link>
              )}
            </div>
          )}

          {goals && goals.length > 0 && (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Goal</TableHead>
                    <TableHead>Thrust area</TableHead>
                    <TableHead>UoM</TableHead>
                    <TableHead className="text-right">Target</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {goals.map((g, idx) => (
                    <TableRow key={g.id}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{g.title}</TableCell>
                      <TableCell>
                        {g.thrust_area_id ? (
                          <Badge variant="muted">{taById.get(g.thrust_area_id)?.name ?? "—"}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{UOM_LABELS[g.uom_type as keyof typeof UOM_LABELS] ?? g.uom_type ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {g.uom_type === "timeline"
                          ? g.target_date
                            ? new Date(g.target_date).toLocaleDateString()
                            : "—"
                          : g.uom_type === "zero"
                            ? "0"
                            : g.target ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{g.weightage}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
