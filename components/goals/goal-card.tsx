"use client";

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { UOM_LABELS, UOM_TYPES } from "@/lib/validations/goal";
import type { ThrustArea, UomType } from "@/types/database";
import type { ValidationError, GoalField } from "@/hooks/use-goal-sheet-validation";
import type { GoalRow } from "./goal-sheet-form";

interface Props {
  index: number;
  goal: GoalRow;
  thrustAreas: ThrustArea[];
  errors: ValidationError[];
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  onChange: (patch: Partial<GoalRow>) => void;
  onDelete: () => void;
  readOnly?: boolean;
}

export function GoalCard({
  index,
  goal,
  thrustAreas,
  errors,
  isCollapsed,
  toggleCollapsed,
  onChange,
  onDelete,
  readOnly,
}: Props) {
  const fieldError = (field: GoalField) =>
    errors.find((e) => e.goalIndex === index && e.field === field)?.message;

  const isPercent = goal.uom_type === "percent_min" || goal.uom_type === "percent_max";
  const showTargetDate = goal.uom_type === "timeline";
  const showTarget = goal.uom_type !== "timeline" && goal.uom_type !== "zero";

  return (
    <Card className={cn("transition-shadow", errors.some((e) => e.goalIndex === index) && "border-destructive/40")}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
              errors.some((e) => e.goalIndex === index)
                ? "bg-destructive/10 text-destructive"
                : "bg-primary/10 text-primary"
            )}
          >
            {index + 1}
          </div>
          <div className="text-sm font-medium">
            {goal.title || `Goal ${index + 1}`}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!readOnly && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDelete}
              aria-label={`Delete goal ${index + 1}`}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            aria-label={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="space-y-4 pt-0">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Thrust area</Label>
              <Select
                value={goal.thrust_area_id ?? ""}
                onValueChange={(v) => onChange({ thrust_area_id: v })}
                disabled={readOnly}
              >
                <SelectTrigger className={cn(fieldError("thrust_area_id") && "border-destructive")}>
                  <SelectValue placeholder="Select thrust area" />
                </SelectTrigger>
                <SelectContent>
                  {thrustAreas.map((ta) => (
                    <SelectItem key={ta.id} value={ta.id}>
                      {ta.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ErrorText msg={fieldError("thrust_area_id")} />
            </div>

            <div className="space-y-1.5">
              <Label>UoM</Label>
              <Select
                value={goal.uom_type}
                onValueChange={(v) => onChange({ uom_type: v as UomType, target: null, target_date: null })}
                disabled={readOnly}
              >
                <SelectTrigger className={cn(fieldError("uom_type") && "border-destructive")}>
                  <SelectValue placeholder="Select UoM" />
                </SelectTrigger>
                <SelectContent>
                  {UOM_TYPES.map((u) => (
                    <SelectItem key={u} value={u}>
                      {UOM_LABELS[u]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ErrorText msg={fieldError("uom_type")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Goal title</Label>
            <Input
              value={goal.title}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="What do you want to achieve?"
              className={cn(fieldError("title") && "border-destructive")}
              disabled={readOnly}
            />
            <ErrorText msg={fieldError("title")} />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              value={goal.description ?? ""}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Optional context, success criteria, links..."
              rows={3}
              disabled={readOnly}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label>
                {showTargetDate
                  ? "Target date"
                  : showTarget
                    ? isPercent ? "Target (%)" : "Target value"
                    : "Target"}
              </Label>
              {showTargetDate ? (
                <Input
                  type="date"
                  value={goal.target_date ?? ""}
                  onChange={(e) => onChange({ target_date: e.target.value })}
                  className={cn(fieldError("target_date") && "border-destructive")}
                  disabled={readOnly}
                />
              ) : showTarget ? (
                <Input
                  type="number"
                  step="any"
                  value={goal.target ?? ""}
                  onChange={(e) =>
                    onChange({
                      target: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  placeholder={isPercent ? "0–100" : "Value"}
                  className={cn(fieldError("target") && "border-destructive")}
                  disabled={readOnly}
                />
              ) : (
                <Input value="0 (zero)" disabled />
              )}
              <ErrorText msg={fieldError("target") ?? fieldError("target_date")} />
            </div>

            <div className="space-y-1.5">
              <Label>Weightage</Label>
              <div className="relative">
                <Input
                  type="number"
                  step="1"
                  min={10}
                  max={100}
                  value={goal.weightage ?? ""}
                  onChange={(e) =>
                    onChange({
                      weightage: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  className={cn("pr-7", fieldError("weightage") && "border-destructive")}
                  disabled={readOnly}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  %
                </span>
              </div>
              <ErrorText msg={fieldError("weightage")} />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function ErrorText({ msg }: { msg?: string | null }) {
  if (!msg) return null;
  return <div className="text-xs text-destructive">{msg}</div>;
}
