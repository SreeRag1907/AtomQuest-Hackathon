"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { initials } from "@/lib/utils";
import { updateUser } from "./actions";
import type { Profile, UserRole } from "@/types/database";

interface Props {
  profiles: Profile[];
  managers: Profile[];
}

const PAGE_SIZE = 25;

function UserRow({
  profile,
  managers,
}: {
  profile: Profile;
  managers: Profile[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  function update(patch: Parameters<typeof updateUser>[1]) {
    startTransition(async () => {
      const r = await updateUser(profile.id, patch);
      if (!r.ok) {
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success("Updated");
      router.refresh();
    });
  }

  function handleActiveToggle(next: boolean) {
    if (!next && profile.is_active) {
      setConfirmDeactivate(true);
      return;
    }
    update({ is_active: next });
  }

  function confirmDeactivateNow() {
    setConfirmDeactivate(false);
    update({ is_active: false });
  }

  return (
    <>
      <TableRow>
        <TableCell>
          <div className="flex items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback>{initials(profile.full_name)}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{profile.full_name}</span>
          </div>
        </TableCell>
        <TableCell className="text-xs text-muted-foreground">{profile.email}</TableCell>
        <TableCell>
          <Badge variant="muted">{profile.department ?? "—"}</Badge>
        </TableCell>
        <TableCell>
          <Select
            value={profile.role}
            disabled={isPending}
            onValueChange={(v) => update({ role: v as UserRole })}
          >
            <SelectTrigger className="h-7 w-32 text-xs" aria-label={`Role for ${profile.full_name}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>
          <Select
            value={profile.manager_id ?? "__none__"}
            disabled={isPending}
            onValueChange={(v) => update({ manager_id: v === "__none__" ? null : v })}
          >
            <SelectTrigger className="h-7 w-44 text-xs" aria-label={`Manager for ${profile.full_name}`}>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— No manager —</SelectItem>
              {managers
                .filter((m) => m.id !== profile.id)
                .map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.full_name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="text-center">
          <Switch
            checked={profile.is_active}
            disabled={isPending}
            onCheckedChange={handleActiveToggle}
            aria-label={`Active toggle for ${profile.full_name}`}
          />
        </TableCell>
      </TableRow>

      <Dialog
        open={confirmDeactivate}
        onOpenChange={(o) => !isPending && setConfirmDeactivate(o)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate {profile.full_name}?</DialogTitle>
            <DialogDescription>
              They will be signed out on next request and lose dashboard access.
              You can reactivate at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDeactivate(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeactivateNow}
              disabled={isPending}
            >
              Deactivate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function UsersTable({ profiles, managers }: Props) {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(profiles.length / PAGE_SIZE));
  const slice = profiles.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Manager</TableHead>
            <TableHead className="text-center">Active</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {slice.map((p) => (
            <UserRow key={p.id} profile={p} managers={managers} />
          ))}
        </TableBody>
      </Table>

      {profiles.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {page * PAGE_SIZE + 1}–
            {Math.min((page + 1) * PAGE_SIZE, profiles.length)} of {profiles.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <span>
              Page {page + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
