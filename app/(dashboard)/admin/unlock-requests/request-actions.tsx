"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { decideUnlockRequest } from "./actions";

interface Props {
  requestId: string;
}

export function RequestActions({ requestId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState<null | "approve" | "reject">(null);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!open) return;
    startTransition(async () => {
      const r = await decideUnlockRequest(requestId, open === "approve" ? "approved" : "rejected", reason);
      if (!r.ok) {
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success(open === "approve" ? "Approved & unlocked" : "Rejected");
      setOpen(null);
      setReason("");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => setOpen("reject")}>
        <X className="h-3.5 w-3.5" /> Reject
      </Button>
      <Button size="sm" onClick={() => setOpen("approve")}>
        <Check className="h-3.5 w-3.5" /> Approve & unlock
      </Button>

      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {open === "approve" ? "Approve unlock request" : "Reject unlock request"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Decision note (logged)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={open === "approve" ? "Reason for approval" : "Reason for rejection"}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(null)}>Cancel</Button>
            <Button onClick={submit} disabled={isPending || reason.trim().length < 5}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {open === "approve" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
