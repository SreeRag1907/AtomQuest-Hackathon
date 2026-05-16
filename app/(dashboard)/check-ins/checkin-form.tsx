"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveAllAchievements, type CheckinRowInput } from "./actions";
import { computeScore } from "@/lib/scoring";
import { UOM_LABELS } from "@/lib/validations/goal";
import { cn } from "@/lib/utils";
import type {
  Achievement,
  AchievementStatus,
  Goal,
  Quarter,
  ThrustArea,
} from "@/types/database";

interface Props {
  sheetId: string;
  quarter: Quarter;
  goals: Goal[];
  achievements: Achievement[];
  thrustAreas: ThrustArea[];
}

interface RowState {
  goal_id: string;
  actual_value: number | null;
  actual_date: string | null;
  status: AchievementStatus;
}

const STATUS_OPTIONS: AchievementStatus[] = ["not_started", "on_track", "completed"];
const STATUS_LABEL: Record<AchievementStatus, string> = {
  not_started: "Not started",
  on_track: "On track",
  completed: "Completed",
};

export function CheckinForm({
  sheetId,
  quarter,
  goals,
  achievements,
  thrustAreas,
}: Props) {
  const taById = useMemo(() => new Map(thrustAreas.map((t) => [t.id, t])), [thrustAreas]);
  const router = useRouter();

  const initialRows: RowState[] = goals.map((g) => {
    const a = achievements.find((x) => x.goal_id === g.id && x.quarter === quarter);
    return {
      goal_id: g.id,
      actual_value: a?.actual_value ?? null,
      actual_date: a?.actual_date ?? null,
      status: a?.status ?? "not_started",
    };
  });

  const [rows, setRows] = useState<RowState[]>(initialRows);
  const [isPending, startTransition] = useTransition();

  function patch(goalId: string, p: Partial<RowState>) {
    setRows((prev) => prev.map((r) => (r.goal_id === goalId ? { ...r, ...p } : r)));
  }

  function save() {
    startTransition(async () => {
      const payload: CheckinRowInput[] = rows.map((r) => ({
        goal_id: r.goal_id,
        actual_value: r.actual_value,
        actual_date: r.actual_date,
        status: r.status,
      }));
      const res = await saveAllAchievements(sheetId, payload);
      if (!res.ok) {
        toast.error(res.error ?? "Failed to save");
        return;
      }
      toast.success(`${quarter.toUpperCase()} check-in saved`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {goals.map((g) => {
        const row = rows.find((r) => r.goal_id === g.id)!;
        const previewAchievement: Achievement = {
          id: "preview",
          goal_id: g.id,
          quarter,
          actual_value: row.actual_value,
          actual_date: row.actual_date,
          status: row.status,
          updated_at: new Date().toISOString(),
          updated_by: null,
        };
        const score = computeScore(g, previewAchievement);
        const previousQuarters = (["q1", "q2", "q3", "q4"] as Quarter[])
          .filter((q) => q !== quarter)
          .map((q) => ({
            quarter: q,
            achievement: achievements.find((a) => a.goal_id === g.id && a.quarter === q),
          }))
          .filter((x) => x.achievement);

        const isPercent = g.uom_type === "percent_min" || g.uom_type === "percent_max";
        const showDate = g.uom_type === "timeline";
        const showValue = g.uom_type !== "timeline";

        return (
          <Card key={g.id}>
            <CardContent className="grid gap-6 p-5 md:grid-cols-3">
              <div className="space-y-3 md:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{g.title}</div>
                    {g.description && (
                      <div className="mt-1 text-xs text-muted-foreground">{g.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {g.thrust_area_id && (
                      <Badge variant="muted">{taById.get(g.thrust_area_id)?.name}</Badge>
                    )}
                    <Badge variant="outline">{g.weightage}%</Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-1 border-t pt-3 text-xs">
                  <span className="text-muted-foreground">
                    UoM: <span className="text-foreground">{UOM_LABELS[g.uom_type as keyof typeof UOM_LABELS]}</span>
                  </span>
                  <span className="text-muted-foreground">
                    Target:{" "}
                    <span className="text-foreground">
                      {g.uom_type === "timeline"
                        ? g.target_date
                          ? new Date(g.target_date).toLocaleDateString()
                          : "—"
                        : g.uom_type === "zero"
                          ? "0"
                          : g.target ?? "—"}
                    </span>
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      {showDate ? "Actual date" : showValue ? `Actual${isPercent ? " (%)" : ""}` : "Actual"}
                    </Label>
                    {showDate ? (
                      <Input
                        type="date"
                        value={row.actual_date ?? ""}
                        onChange={(e) => patch(g.id, { actual_date: e.target.value || null })}
                      />
                    ) : (
                      <Input
                        type="number"
                        step="any"
                        value={row.actual_value ?? ""}
                        onChange={(e) =>
                          patch(g.id, {
                            actual_value: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={row.status}
                      onValueChange={(v) => patch(g.id, { status: v as AchievementStatus })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Score</Label>
                    <div
                      className={cn(
                        "flex h-9 items-center rounded-md border px-3 text-sm font-medium tabular-nums",
                        score == null
                          ? "bg-muted/50 text-muted-foreground"
                          : score >= 80
                            ? "border-success/30 bg-success/10 text-success"
                            : score >= 50
                              ? "border-warning/30 bg-warning/10 text-warning"
                              : "border-destructive/30 bg-destructive/10 text-destructive"
                      )}
                    >
                      {score == null ? "—" : `${Math.round(score)}%`}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 border-l pl-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Previous quarters
                </div>
                {previousQuarters.length === 0 ? (
                  <div className="text-xs text-muted-foreground">—</div>
                ) : (
                  <ul className="space-y-1.5">
                    {previousQuarters.map(({ quarter: q, achievement: a }) => {
                      const s = computeScore(g, a ?? null);
                      return (
                        <li
                          key={q}
                          className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1.5 text-xs"
                        >
                          <div>
                            <div className="font-medium uppercase">{q}</div>
                            <div className="text-muted-foreground">
                              {g.uom_type === "timeline"
                                ? a?.actual_date
                                  ? new Date(a.actual_date).toLocaleDateString()
                                  : "—"
                                : a?.actual_value ?? "—"}
                            </div>
                          </div>
                          <div className="font-medium tabular-nums">
                            {s == null ? "—" : `${Math.round(s)}%`}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <div className="sticky bottom-0 -mx-6 mt-6 border-t bg-background/95 px-6 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            All goals save together. Auto-recompute happens server-side.
          </div>
          <Button onClick={save} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save check-in
          </Button>
        </div>
      </div>
    </div>
  );
}
