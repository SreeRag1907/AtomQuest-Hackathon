"use client";

import { useTransition } from "react";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendCheckinReminder } from "@/app/(dashboard)/admin/escalation/actions";

interface Props {
  employeeId: string;
  employeeName: string;
}

/**
 * Manual one-click check-in reminder for managers/admins on the
 * team member detail page. No-op (with friendly error) outside a
 * check-in window.
 */
export function CheckinReminderButton({ employeeId, employeeName }: Props) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const r = await sendCheckinReminder(employeeId);
          if (!r.ok) toast.error(r.error ?? "Failed");
          else toast.success(`Reminder sent to ${employeeName}`);
        })
      }
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Bell className="h-3.5 w-3.5" />
      )}
      Send check-in reminder
    </Button>
  );
}
