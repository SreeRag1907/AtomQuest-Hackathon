import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CycleControls } from "./cycle-controls";
import { phaseLabel } from "@/lib/cycle";
import type { Cycle } from "@/types/database";

interface CycleOverviewCardProps {
  cycle: Cycle;
}

export function CycleOverviewCard({ cycle }: CycleOverviewCardProps) {
  const slots = [
    { label: "Goal setting", opens: cycle.goal_setting_opens, closes: cycle.goal_setting_closes },
    { label: "Q1 check-in", opens: cycle.q1_opens, closes: cycle.q1_closes },
    { label: "Q2 check-in", opens: cycle.q2_opens, closes: cycle.q2_closes },
    { label: "Q3 check-in", opens: cycle.q3_opens, closes: cycle.q3_closes },
    { label: "Q4 / annual", opens: cycle.q4_opens, closes: cycle.q4_closes },
  ] as const;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-4 border-b bg-muted/20 p-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">{cycle.name}</h2>
            {cycle.is_active ? (
              <Badge variant="success" className="font-normal">
                Active
              </Badge>
            ) : (
              <Badge variant="muted" className="font-normal">
                Inactive
              </Badge>
            )}
            <Badge variant="outline" className="font-normal">
              {phaseLabel(cycle.current_phase)}
            </Badge>
          </div>
        </div>
        <div className="shrink-0 sm:pt-0.5">
          <CycleControls cycle={cycle} />
        </div>
      </CardHeader>
      <CardContent className="p-5">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Schedule
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {slots.map(({ label, opens, closes }) => (
            <li
              key={label}
              className="rounded-lg border border-border/80 bg-muted/25 px-3 py-2.5 shadow-none"
            >
              <div className="text-xs font-medium">{label}</div>
              <div className="mt-1 text-xs text-muted-foreground leading-snug">{fmtRange(opens, closes)}</div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function fmtRange(open: string | null, close: string | null) {
  if (!open && !close) return "Not set";
  const fmt = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
      : "—";
  return `${fmt(open)} → ${fmt(close)}`;
}
