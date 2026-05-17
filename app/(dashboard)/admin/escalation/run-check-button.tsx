"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runEscalationCheck } from "./actions";

export function RunCheckButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const r = await runEscalationCheck();
      if (!r.ok) {
        toast.error(r.error ?? "Failed");
        return;
      }
      const totals = (r.data ?? []).reduce(
        (acc, x) => ({ fired: acc.fired + x.fired, skipped: acc.skipped + x.skipped }),
        { fired: 0, skipped: 0 }
      );
      if (totals.fired === 0) {
        toast.success("No new escalations — everyone is on track.");
      } else {
        toast.success(
          `${totals.fired} escalation${totals.fired === 1 ? "" : "s"} fired.`
        );
      }
      router.refresh();
    });
  }

  return (
    <Button onClick={run} disabled={isPending}>
      {isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <PlayCircle className="h-4 w-4" />
      )}
      Run check now
    </Button>
  );
}
