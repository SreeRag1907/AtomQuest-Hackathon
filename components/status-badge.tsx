import { cn } from "@/lib/utils";
import type { GoalStatus } from "@/types/database";

const GOAL_STATUS_STYLES: Record<GoalStatus, { label: string; className: string; dot: string }> = {
  draft: {
    label: "Draft",
    className: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/60",
  },
  submitted: {
    label: "Submitted",
    className: "bg-warning/15 text-warning",
    dot: "bg-warning",
  },
  approved: {
    label: "Approved",
    className: "bg-success/15 text-success",
    dot: "bg-success",
  },
  locked: {
    label: "Approved & active",
    className: "bg-primary/10 text-primary",
    dot: "bg-primary",
  },
  returned: {
    label: "Returned",
    className: "bg-destructive/15 text-destructive",
    dot: "bg-destructive",
  },
};

interface StatusBadgeProps {
  status: GoalStatus;
  className?: string;
}

export function GoalStatusBadge({ status, className }: StatusBadgeProps) {
  const s = GOAL_STATUS_STYLES[status];
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        s.className,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </div>
  );
}

