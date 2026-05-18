import { Info } from "lucide-react";

export function DemoPhaseHint() {
  return (
    <div className="flex gap-3 rounded-xl border border-border/80 bg-muted/30 px-4 py-3 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="space-y-1 text-muted-foreground">
        <p className="font-medium text-foreground">Manual phase controls (demo)</p>
        <p className="text-xs leading-relaxed sm:text-sm">
          Production would typically advance phases on schedule (e.g. cron). Here you jump phases so reviewers can walk
          the full flow in one sitting.
        </p>
      </div>
    </div>
  );
}
