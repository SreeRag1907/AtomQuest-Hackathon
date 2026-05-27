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

  const totalClass =
    tone === "destructive"
      ? "text-destructive"
      : tone === "success"
        ? "text-success"
        : "text-warning";

  return (
    <div
      className={cn(
        // Sticky + edge-to-edge: pull out of the parent's px-6 via negative
        // inset on sm+ where the container has that padding, and zero on
        // mobile where the page already extends to the edge.
        "sticky top-14 z-20 mb-4 border-b bg-background/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6"
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <span className="font-medium tabular-nums">{goalCount}</span>
              <span className="text-muted-foreground"> of {maxGoals} goals</span>
            </div>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">Total:</span>{" "}
            <span className={cn("font-semibold tabular-nums", totalClass)}>{total}%</span>
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
            className="w-full sm:w-48"
            indicatorClassName={indicatorClass}
          />
        </div>
      </div>
    </div>
  );
}
