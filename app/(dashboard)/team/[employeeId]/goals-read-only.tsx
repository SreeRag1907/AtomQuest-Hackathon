import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UOM_LABELS } from "@/lib/validations/goal";
import type { Goal, ThrustArea } from "@/types/database";

interface Props {
  goals: Goal[];
  thrustAreas: ThrustArea[];
}

export function GoalsReadOnly({ goals, thrustAreas }: Props) {
  const taById = new Map(thrustAreas.map((t) => [t.id, t]));
  if (goals.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          No goals on this sheet yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {goals.map((g, idx) => (
        <Card key={g.id}>
          <CardContent className="space-y-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                  {idx + 1}
                </div>
                <div>
                  <div className="text-sm font-medium">{g.title}</div>
                  {g.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>
                  )}
                </div>
              </div>
              <Badge variant="muted">{g.weightage}%</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t pt-3 text-xs sm:grid-cols-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Thrust area
                </div>
                <div className="mt-1 text-sm">
                  {g.thrust_area_id ? taById.get(g.thrust_area_id)?.name : "—"}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  UoM
                </div>
                <div className="mt-1 text-sm">
                  {UOM_LABELS[g.uom_type as keyof typeof UOM_LABELS]}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Target
                </div>
                <div className="mt-1 text-sm">
                  {g.uom_type === "timeline"
                    ? g.target_date
                      ? new Date(g.target_date).toLocaleDateString()
                      : "—"
                    : g.uom_type === "zero"
                      ? "0"
                      : g.target ?? "—"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
