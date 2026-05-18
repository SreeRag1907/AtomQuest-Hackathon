"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, Power } from "lucide-react";
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
    <div className="flex flex-wrap items-center justify-end gap-2">
      {!cycle.is_active && (
        <Button size="sm" variant="outline" onClick={handleActivate} disabled={isPending}>
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Power className="h-3 w-3" />}
          Activate
        </Button>
      )}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="secondary"
            className="gap-1 font-normal"
            disabled={!cycle.is_active || isPending}
          >
            Advance phase
            <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[12rem]">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Jump to phase</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {PHASES.map((p) => (
            <DropdownMenuItem
              key={p}
              className="flex w-full justify-between gap-4"
              disabled={p === cycle.current_phase || isPending}
              onClick={() => handleSetPhase(p)}
            >
              <span>{phaseLabel(p)}</span>
              {p === cycle.current_phase && <span className="text-xs text-muted-foreground">Now</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
