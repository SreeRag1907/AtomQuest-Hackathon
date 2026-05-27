"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!fullName || !email || !password) {
      const msg = "All fields are required";
      setError(msg);
      toast.error(msg);
      return;
    }
    if (password.length < 8) {
      const msg = "Password must be at least 8 characters";
      setError(msg);
      toast.error(msg);
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      if (devEmailBypass) {
        const r = await signUpWithoutAuthEmail(email, password, fullName, department);
        if (!r.ok) {
          setError(r.error);
          toast.error(r.error);
          return;
        }
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) {
          setError(signInError.message);
          toast.error(signInError.message);
          return;
        }
        toast.success("Account created");
        router.replace("/dashboard");
        router.refresh();
        return;
      }
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, department },
        },
      });
      if (signUpError) {
        setError(signUpError.message);
        toast.error(signUpError.message);
        return;
      }
      if (!data.session) {
        setPendingConfirm(true);
        toast.success("Account created. Check your inbox to confirm your email.");
        return;
      }
      toast.success("Account created");
      router.replace("/dashboard");
      router.refresh();
    });
  }

  if (pendingConfirm) {
    return (
      <div
        role="status"
        className="space-y-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-5 text-sm"
      >
        <p className="font-medium">Almost there</p>
        <p className="text-muted-foreground">
          We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>.
          Click it to activate your account, then sign in.
        </p>
        <Button variant="outline" className="w-full" onClick={() => router.replace("/login")}>
          Go to sign in
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4"
      noValidate
    >
      {devEmailBypass ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100/90">
          Dev mode: accounts are created without a confirmation email (no Supabase mail quota used).
        </p>
      ) : null}
      <p className="rounded-md border border-muted-foreground/20 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        New self-service accounts are created as <strong>Employee</strong>. Manager and Admin roles
        are assigned by an administrator.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="full_name">Full name</Label>
        <Input
          id="full_name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          aria-invalid={!!error && !fullName ? true : undefined}
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
          aria-invalid={!!error && !email ? true : undefined}
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
          aria-invalid={!!error && password.length < 8 ? true : undefined}
          required
          minLength={8}
        />
        <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="department">Department (optional)</Label>
        <Input
          id="department"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          placeholder="Engineering"
        />
      </div>

      <div className="min-h-[1.25rem]" aria-live="polite">
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Creating…
          </>
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}
