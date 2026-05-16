"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { managerUpdateGoals } from "@/app/(dashboard)/team/actions";
import { UOM_LABELS } from "@/lib/validations/goal";
import { InlineSpinner } from "@/components/page-loading";
import { cn } from "@/lib/utils";
import type { Goal, ThrustArea } from "@/types/database";

interface Props {
  sheetId: string;
  goals: Goal[];
  thrustAreas: ThrustArea[];
}

interface RowState {
  id: string;
  title: string;
  description: string | null;
  thrust_area_id: string | null;
  target: number | null;
  target_date: string | null;
  weightage: number;
  isChild: boolean;
  uom_type: string;
  __dirty: boolean;
}

export function GoalsManagerEdit({ sheetId, goals, thrustAreas }: Props) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [isSaving, startSaving] = React.useTransition();
  const [rows, setRows] = React.useState<RowState[]>(() => fromGoals(goals));

  React.useEffect(() => {
    setRows(fromGoals(goals));
    setEditing(false);
  }, [goals]);

  function fromGoals(gs: Goal[]): RowState[] {
    return gs.map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description ?? null,
      thrust_area_id: g.thrust_area_id,
      target: g.target,
      target_date: g.target_date,
      weightage: g.weightage,
      isChild: !!g.parent_goal_id,
      uom_type: g.uom_type,
      __dirty: false,
    }));
  }

  function patch(id: string, p: Partial<RowState>) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...p, __dirty: true } : r))
    );
  }

  const total = rows.reduce((acc, r) => acc + (r.weightage || 0), 0);
  const valid = total === 100 && rows.every((r) => !!r.title.trim());

  function handleCancel() {
    setRows(fromGoals(goals));
    setEditing(false);
  }

  function handleSave() {
    if (!valid) {
      toast.error(`Weightages must sum to 100% (currently ${total}%)`);
      return;
    }
    const dirtyEdits = rows
      .filter((r) => r.__dirty && !r.isChild)
      .map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        thrust_area_id: r.thrust_area_id,
        target: r.target,
        target_date: r.target_date,
        weightage: r.weightage,
      }));
    if (dirtyEdits.length === 0) {
      setEditing(false);
      return;
    }
    startSaving(async () => {
      const res = await managerUpdateGoals(sheetId, dirtyEdits);
      if (!res.ok) {
        toast.error(res.error ?? "Could not save edits");
        return;
      }
      toast.success(`Saved edits to ${dirtyEdits.length} goal${dirtyEdits.length === 1 ? "" : "s"}`);
      setEditing(false);
      router.refresh();
    });
  }

  const taById = new Map(thrustAreas.map((t) => [t.id, t]));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-md border bg-muted/30 px-4 py-2 text-sm">
        <div>
          <span className="font-medium">Inline review edits</span>{" "}
          <span className="text-muted-foreground">
            — minor adjustments save to audit log without forcing a return.
          </span>
        </div>
        <div className="flex items-center gap-2">
          {editing && (
            <Badge variant={total === 100 ? "success" : "destructive"}>
              Total: {total}%
            </Badge>
          )}
          {!editing ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Pencil className="mr-1 h-4 w-4" />
              Edit goals
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="mr-1 h-4 w-4" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!valid || isSaving}
              >
                {isSaving ? (
                  <InlineSpinner className="mr-1" />
                ) : (
                  <Save className="mr-1 h-4 w-4" />
                )}
                Save edits
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((r, idx) => {
          const isPercent =
            r.uom_type === "percent_min" || r.uom_type === "percent_max";
          const showDate = r.uom_type === "timeline";
          const showTarget = r.uom_type !== "timeline" && r.uom_type !== "zero";
          const lockChild = r.isChild;

          return (
            <Card
              key={r.id}
              className={cn(
                lockChild && "bg-muted/20",
                r.__dirty && "border-warning/40"
              )}
            >
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {idx + 1}
                  </div>
                  <div className="flex-1 space-y-3">
                    {editing && !lockChild ? (
                      <Input
                        value={r.title}
                        onChange={(e) => patch(r.id, { title: e.target.value })}
                        className="font-medium"
                      />
                    ) : (
                      <div className="text-sm font-medium">{r.title}</div>
                    )}
                    {editing && !lockChild ? (
                      <Textarea
                        value={r.description ?? ""}
                        onChange={(e) =>
                          patch(r.id, { description: e.target.value })
                        }
                        rows={2}
                        placeholder="Description (optional)"
                      />
                    ) : (
                      r.description && (
                        <p className="text-sm text-muted-foreground">
                          {r.description}
                        </p>
                      )
                    )}
                  </div>
                  {lockChild && (
                    <Badge variant="muted" className="shrink-0">
                      shared (locked)
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 border-t pt-3 text-xs sm:grid-cols-4">
                  <Field label="Thrust area">
                    {editing && !lockChild ? (
                      <Select
                        value={r.thrust_area_id ?? ""}
                        onValueChange={(v) =>
                          patch(r.id, { thrust_area_id: v || null })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {thrustAreas.map((ta) => (
                            <SelectItem key={ta.id} value={ta.id}>
                              {ta.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span>
                        {r.thrust_area_id
                          ? taById.get(r.thrust_area_id)?.name
                          : "—"}
                      </span>
                    )}
                  </Field>
                  <Field label="UoM">
                    {UOM_LABELS[r.uom_type as keyof typeof UOM_LABELS]}
                  </Field>
                  <Field label={showDate ? "Target date" : isPercent ? "Target (%)" : "Target"}>
                    {showDate ? (
                      editing && !lockChild ? (
                        <Input
                          type="date"
                          value={r.target_date ?? ""}
                          onChange={(e) =>
                            patch(r.id, { target_date: e.target.value || null })
                          }
                        />
                      ) : (
                        <span>
                          {r.target_date
                            ? new Date(r.target_date).toLocaleDateString()
                            : "—"}
                        </span>
                      )
                    ) : showTarget ? (
                      editing && !lockChild ? (
                        <Input
                          type="number"
                          step="any"
                          value={r.target ?? ""}
                          onChange={(e) =>
                            patch(r.id, {
                              target:
                                e.target.value === ""
                                  ? null
                                  : Number(e.target.value),
                            })
                          }
                        />
                      ) : (
                        <span>{r.target ?? "—"}</span>
                      )
                    ) : (
                      <span>0</span>
                    )}
                  </Field>
                  <Field label="Weightage">
                    {editing && !lockChild ? (
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={r.weightage}
                        onChange={(e) =>
                          patch(r.id, {
                            weightage: Number(e.target.value || 0),
                          })
                        }
                      />
                    ) : (
                      <Badge variant="muted">{r.weightage}%</Badge>
                    )}
                  </Field>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}
