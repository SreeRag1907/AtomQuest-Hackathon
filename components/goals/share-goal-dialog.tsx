"use client";

import * as React from "react";
import { Share2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { initials } from "@/lib/utils";
import { InlineSpinner } from "@/components/page-loading";
import {
  pushSharedGoal,
  removeSharedRecipients,
} from "@/app/(dashboard)/goals/shared-actions";
import type { Profile } from "@/types/database";

export interface ShareRecipient {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
}

interface Props {
  goalId: string;
  goalTitle: string;
  candidates: ShareRecipient[];
  existingRecipientIds: string[];
  triggerVariant?: "icon" | "button";
  disabled?: boolean;
  disabledReason?: string;
}

export function ShareGoalDialog({
  goalId,
  goalTitle,
  candidates,
  existingRecipientIds,
  triggerVariant = "icon",
  disabled,
  disabledReason,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [filter, setFilter] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!open) {
      setSelected(new Set());
      setFilter("");
    }
  }, [open]);

  const existingSet = React.useMemo(
    () => new Set(existingRecipientIds),
    [existingRecipientIds]
  );

  const filtered = React.useMemo(() => {
    const q = filter.toLowerCase().trim();
    if (!q) return candidates;
    return candidates.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.department ?? "").toLowerCase().includes(q)
    );
  }, [candidates, filter]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handlePush() {
    const ids = [...selected].filter((id) => !existingSet.has(id));
    if (ids.length === 0) {
      toast.error("Select at least one new recipient");
      return;
    }
    startTransition(async () => {
      const r = await pushSharedGoal(goalId, ids);
      if (!r.ok) {
        toast.error(r.error ?? "Could not share");
        return;
      }
      const skippedCount = r.skipped?.length ?? 0;
      toast.success(
        `Shared with ${r.pushed ?? ids.length} ${
          (r.pushed ?? ids.length) === 1 ? "person" : "people"
        }${skippedCount ? ` (${skippedCount} skipped)` : ""}`
      );
      setOpen(false);
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const r = await removeSharedRecipients(goalId, [id]);
      if (!r.ok) {
        toast.error(r.error ?? "Could not remove");
        return;
      }
      toast.success("Recipient unlinked");
    });
  }

  const trigger =
    triggerVariant === "icon" ? (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title={disabled ? disabledReason : "Share with team"}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Share2 className="h-4 w-4" />
      </Button>
    ) : (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Share2 className="mr-1 h-4 w-4" />
        Share with team
      </Button>
    );

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Share goal with team</DialogTitle>
            <DialogDescription>
              Push <span className="font-medium text-foreground">"{goalTitle}"</span> to
              one or more reports. Each recipient gets a linked copy on their
              draft sheet — they can adjust their own weightage. Achievements you
              enter here will sync to all linked sheets.
            </DialogDescription>
          </DialogHeader>

          {existingRecipientIds.length > 0 && (
            <div className="mb-2 space-y-2 rounded-md border bg-muted/30 p-3">
              <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Currently shared with
              </div>
              <div className="flex flex-wrap gap-2">
                {existingRecipientIds.map((rid) => {
                  const c = candidates.find((x) => x.id === rid);
                  if (!c) return null;
                  return (
                    <Badge
                      key={rid}
                      variant="muted"
                      className="flex items-center gap-1 pr-1"
                    >
                      {c.full_name}
                      <button
                        type="button"
                        onClick={() => handleRemove(rid)}
                        className="ml-1 rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-destructive"
                        aria-label={`Remove ${c.full_name}`}
                        disabled={isPending}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          <Input
            placeholder="Search by name, email, or department..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mb-2"
          />

          <div className="max-h-72 overflow-y-auto rounded-md border">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No candidates match.
              </div>
            ) : (
              <ul className="divide-y">
                {filtered.map((c) => {
                  const already = existingSet.has(c.id);
                  const checked = selected.has(c.id);
                  return (
                    <li
                      key={c.id}
                      className="flex items-center gap-3 px-3 py-2"
                    >
                      <Checkbox
                        checked={checked || already}
                        disabled={already}
                        onCheckedChange={() => !already && toggle(c.id)}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{initials(c.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {c.full_name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {c.department ?? "—"} · {c.email}
                        </div>
                      </div>
                      {already && (
                        <Badge variant="muted" className="shrink-0">
                          shared
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePush} disabled={isPending}>
              {isPending && <InlineSpinner className="mr-2" />}
              Share with selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export type { Profile };
