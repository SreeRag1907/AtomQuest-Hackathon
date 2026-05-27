"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { managerCreateGoalSheetForEmployee } from "@/app/(dashboard)/team/actions";

export function StartAssignButton({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function start() {
    startTransition(async () => {
      const r = await managerCreateGoalSheetForEmployee(employeeId);
      if (!r.ok) {
        toast.error(r.error ?? "Could not start assignment");
        return;
      }
      router.refresh();
    });
  }

  return (
    <Button onClick={start} disabled={isPending}>
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Creating draft…
        </>
      ) : (
        "Start assigning"
      )}
    </Button>
  );
}
