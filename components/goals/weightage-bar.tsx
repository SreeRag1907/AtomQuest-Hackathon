"use client";

import { CheckCircle2, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface Props {
  total: number;
  goalCount: number;
  maxGoals?: number;
}

export function WeightageBar({ total, goalCount, maxGoals = 8 }: Props) {
  const reached = total === 100;
  const over = total > 100;
  const tone = over ? "destructive" : reached ? "success" : "warning";
  const indicatorClass =
    tone === "destructive"
      ? "bg-destructive"
      : tone === "success"
        ? "bg-success"
        : "bg-warning";

  return (
    <div
      className={cn(
        "sticky top-14 z-20 -mx-6 mb-4 border-b bg-background/95 px-6 py-3 backdrop-blur"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <span className="font-medium tabular-nums">{goalCount}</span>
              <span className="text-muted-foreground"> of {maxGoals} goals</span>
            </div>
          </div>
          <div className="hidden text-sm sm:block">
            <span className="text-muted-foreground">Total weightage:</span>{" "}
            <span
              className={cn(
                "font-semibold tabular-nums",
                tone === "destructive"
                  ? "text-destructive"
                  : tone === "success"
                    ? "text-success"
                    : "text-warning"
              )}
            >
              {total}%
            </span>
            <span className="text-muted-foreground"> / 100%</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {reached && (
            <div className="flex items-center gap-1 text-xs font-medium text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Ready to submit
            </div>
          )}
          <Progress
            value={Math.min(total, 100)}
            className="w-48"
            indicatorClassName={indicatorClass}
          />
        </div>
      </div>
    </div>
  );
}
