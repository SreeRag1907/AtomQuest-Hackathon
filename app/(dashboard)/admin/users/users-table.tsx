"use client";

import { useTransition } from "react";
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
import { initials } from "@/lib/utils";
import { updateUser } from "./actions";
import type { Profile, UserRole } from "@/types/database";

interface Props {
  profiles: Profile[];
  managers: Profile[];
}

export function UsersTable({ profiles, managers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function update(id: string, patch: Parameters<typeof updateUser>[1]) {
    startTransition(async () => {
      const r = await updateUser(id, patch);
      if (!r.ok) {
        toast.error(r.error ?? "Failed");
        return;
      }
      toast.success("Updated");
      router.refresh();
    });
  }

  return (
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
        {profiles.map((p) => (
          <TableRow key={p.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarFallback>{initials(p.full_name)}</AvatarFallback>
                </Avatar>
                <span className="font-medium">{p.full_name}</span>
              </div>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">{p.email}</TableCell>
            <TableCell>
              <Badge variant="muted">{p.department ?? "—"}</Badge>
            </TableCell>
            <TableCell>
              <Select
                value={p.role}
                disabled={isPending}
                onValueChange={(v) => update(p.id, { role: v as UserRole })}
              >
                <SelectTrigger className="h-7 w-32 text-xs">
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
                value={p.manager_id ?? "__none__"}
                disabled={isPending}
                onValueChange={(v) =>
                  update(p.id, { manager_id: v === "__none__" ? null : v })
                }
              >
                <SelectTrigger className="h-7 w-44 text-xs">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— No manager —</SelectItem>
                  {managers
                    .filter((m) => m.id !== p.id)
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
                checked={p.is_active}
                disabled={isPending}
                onCheckedChange={(v) => update(p.id, { is_active: v })}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
