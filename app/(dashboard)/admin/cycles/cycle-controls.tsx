"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Power } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { activateCycle, setPhase } from "./actions";
import { phaseLabel } from "@/lib/cycle";
import type { Cycle, CyclePhase } from "@/types/database";

const PHASES: CyclePhase[] = [
  "not_started",
  "goal_setting",
  "q1",
  "q2",
  "q3",
  "q4_annual",
  "closed",
];

export function CycleControls({ cycle }: { cycle: Cycle }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleActivate() {
    startTransition(async () => {
      const r = await activateCycle(cycle.id);
      if (!r.ok) {
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success(`${cycle.name} is now the active cycle`);
      router.refresh();
    });
  }

  function handleSetPhase(phase: CyclePhase) {
    startTransition(async () => {
      const r = await setPhase(cycle.id, phase);
      if (!r.ok) {
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success(`Phase advanced to ${phaseLabel(phase)}`);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {!cycle.is_active && (
        <Button size="sm" variant="outline" onClick={handleActivate} disabled={isPending}>
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Power className="h-3 w-3" />}
          Activate
        </Button>
      )}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost" disabled={!cycle.is_active}>
            Advance phase…
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Set phase</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {PHASES.map((p) => (
            <DropdownMenuItem
              key={p}
              disabled={p === cycle.current_phase || isPending}
              onClick={() => handleSetPhase(p)}
            >
              {phaseLabel(p)}
              {p === cycle.current_phase && <span className="ml-2 text-xs text-muted-foreground">(current)</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
