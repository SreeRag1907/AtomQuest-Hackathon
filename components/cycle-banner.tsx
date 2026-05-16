import { Calendar, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { phaseLabel, phaseCloseDate, daysUntil } from "@/lib/cycle";
import type { Cycle } from "@/types/database";

interface Props {
  cycle: Cycle;
}

export function CycleBanner({ cycle }: Props) {
  const closes = phaseCloseDate(cycle);
  const days = daysUntil(closes);

  return (
    <Card className="border-primary/30 bg-gradient-to-r from-primary/5 via-card to-card">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Calendar className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-medium">
              {cycle.name} — {phaseLabel(cycle.current_phase)}
            </div>
            <div className="text-xs text-muted-foreground">
              {closes
                ? `Window ${days != null && days < 0 ? "closed" : "closes"} ${
                    closes
                      ? new Date(closes).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : ""
                  }`
                : "Cycle in progress"}
            </div>
          </div>
        </div>
        {days != null && days >= 0 && days <= 30 && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-warning">
            <Clock className="h-3.5 w-3.5" />
            {days === 0 ? "Closes today" : `${days} day${days === 1 ? "" : "s"} left`}
          </div>
        )}
      </div>
    </Card>
  );
}
