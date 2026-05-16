import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { computeScore, computeSheetScore } from "@/lib/scoring";
import { UOM_LABELS } from "@/lib/validations/goal";
import type {
  Achievement,
  Cycle,
  Goal,
  GoalSheet,
  Quarter,
} from "@/types/database";

const QUARTERS: Quarter[] = ["q1", "q2", "q3", "q4"];

export default async function CheckinHistoryPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: cycle } = await supabase
    .from("cycles")
    .select("*")
    .eq("is_active", true)
    .single<Cycle>();

  const { data: sheet } = cycle
    ? await supabase
        .from("goal_sheets")
        .select("*")
        .eq("employee_id", profile.id)
        .eq("cycle_id", cycle.id)
        .maybeSingle<GoalSheet>()
    : { data: null };

  if (!sheet) {
    return (
      <div className="space-y-6">
        <PageHeader title="Check-in history" />
        <EmptyState icon={CalendarDays} title="No history yet" description="Once you complete check-ins, they'll appear here." />
      </div>
    );
  }

  const { data: goals } = await supabase
    .from("goals")
    .select("*")
    .eq("goal_sheet_id", sheet.id)
    .order("display_order");

  const goalIds = (goals ?? []).map((g) => g.id);
  const { data: achievements } = goalIds.length
    ? await supabase.from("achievements").select("*").in("goal_id", goalIds)
    : { data: [] as Achievement[] };

  const quartersWithData = QUARTERS.filter((q) =>
    (achievements ?? []).some((a) => a.quarter === q)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Check-in history"
        description={`${cycle?.name ?? ""} timeline of your quarterly achievements`}
      />

      {quartersWithData.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No check-ins recorded"
          description="When you submit your first quarterly check-in, it'll show up here."
        />
      ) : (
        <div className="space-y-4">
          {quartersWithData.map((q) => {
            const qAchievements = (achievements ?? []).filter((a) => a.quarter === q);
            const score = computeSheetScore(goals ?? ([] as Goal[]), qAchievements);
            const completed = qAchievements.filter((a) => a.status === "completed").length;
            return (
              <Card key={q}>
                <CardContent className="p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold">{q.toUpperCase()}</div>
                      <div className="text-xs text-muted-foreground">
                        {completed}/{(goals ?? []).length} goals completed
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress
                        value={score ?? 0}
                        className="w-40"
                        indicatorClassName={
                          score && score >= 80
                            ? "bg-success"
                            : score && score >= 50
                              ? "bg-warning"
                              : "bg-primary"
                        }
                      />
                      <Badge variant="outline" className="tabular-nums">
                        {score == null ? "—" : `${Math.round(score)}% score`}
                      </Badge>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Goal</TableHead>
                        <TableHead>UoM</TableHead>
                        <TableHead className="text-right">Target</TableHead>
                        <TableHead className="text-right">Actual</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(goals ?? []).map((g) => {
                        const a = qAchievements.find((x) => x.goal_id === g.id) ?? null;
                        const s = computeScore(g, a);
                        return (
                          <TableRow key={g.id}>
                            <TableCell className="font-medium">{g.title}</TableCell>
                            <TableCell className="text-xs">
                              {UOM_LABELS[g.uom_type as keyof typeof UOM_LABELS]}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {g.uom_type === "timeline"
                                ? g.target_date
                                  ? new Date(g.target_date).toLocaleDateString()
                                  : "—"
                                : g.uom_type === "zero"
                                  ? "0"
                                  : g.target ?? "—"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {g.uom_type === "timeline"
                                ? a?.actual_date
                                  ? new Date(a.actual_date).toLocaleDateString()
                                  : "—"
                                : a?.actual_value ?? "—"}
                            </TableCell>
                            <TableCell>
                              {a ? (
                                <Badge
                                  variant={
                                    a.status === "completed"
                                      ? "success"
                                      : a.status === "on_track"
                                        ? "warning"
                                        : "muted"
                                  }
                                >
                                  {a.status.replace("_", " ")}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {s == null ? "—" : `${Math.round(s)}%`}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
