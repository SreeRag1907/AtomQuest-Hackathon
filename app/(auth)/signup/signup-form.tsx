"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { signUpWithoutAuthEmail } from "./actions";

interface Props {
  /** When true, creates the user on the server without Supabase confirmation emails (dev only). */
  devEmailBypass?: boolean;
}

export function SignupForm({ devEmailBypass = false }: Props) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState("employee");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!fullName || !email || !password) {
      toast.error("All fields are required");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      if (devEmailBypass) {
        const r = await signUpWithoutAuthEmail(email, password, fullName, role, department);
        if (!r.ok) {
          toast.error(r.error);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("Account created");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName, role, department },
          },
        });
        if (error) {
          toast.error(error.message);
          return;
        }
        toast.success("Account created");
      }
      router.replace("/dashboard");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4"
    >
      {devEmailBypass ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100/90">
          Dev mode: accounts are created without a confirmation email (no Supabase mail quota used).
        </p>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="Engineering"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="employee">Employee</SelectItem>
              <SelectItem value="manager">Manager</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
      </Button>
    </form>
  );
}
