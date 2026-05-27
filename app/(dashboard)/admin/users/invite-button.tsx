"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteUser } from "./actions";
import type { Profile, UserRole } from "@/types/database";

interface Props {
  managers: Profile[];
}

export function InviteButton({ managers }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState({
    email: "",
    fullName: "",
    role: "employee" as UserRole,
    department: "",
    managerId: "__none__",
  });

  function reset() {
    setForm({ email: "", fullName: "", role: "employee", department: "", managerId: "__none__" });
  }

  function submit() {
    startTransition(async () => {
      const r = await inviteUser(
        form.email,
        form.fullName,
        form.role,
        form.department || null,
        form.managerId === "__none__" ? null : form.managerId
      );
      if (!r.ok) {
        toast.error(r.error ?? "Failed");
        return;
      }
      if (r.devPassword) {
        toast.success("User created — no email sent (dev bypass).", {
          duration: 45_000,
          description: `Password for ${form.email}: ${r.devPassword}`,
        });
      } else {
        toast.success(`Invite sent to ${form.email}`);
      }
      setOpen(false);
      reset();
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (isPending) return;
        if (!o) reset();
        setOpen(o);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4" /> Invite user
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a new user</DialogTitle>
          <DialogDescription>
            They&apos;ll receive an email with a magic-link sign-in. Requires
            SUPABASE_SERVICE_ROLE_KEY.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Full name</Label>
            <Input
              id="invite-name"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as UserRole })}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-dept">Department</Label>
              <Input
                id="invite-dept"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </div>
          </div>
          {form.role !== "admin" ? (
            <div className="space-y-1.5">
              <Label htmlFor="invite-manager">Reports to (optional)</Label>
              <Select
                value={form.managerId}
                onValueChange={(v) => setForm({ ...form, managerId: v })}
              >
                <SelectTrigger id="invite-manager">
                  <SelectValue placeholder="No manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— No manager —</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isPending || !form.email || !form.fullName}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}
            Send invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
