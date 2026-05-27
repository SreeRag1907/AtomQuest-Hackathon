"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (password.length < 8) {
      const msg = "Password must be at least 8 characters";
      setError(msg);
      toast.error(msg);
      return;
    }
    if (password !== confirm) {
      const msg = "Passwords do not match";
      setError(msg);
      toast.error(msg);
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        toast.error(updateError.message);
        return;
      }
      toast.success("Password updated");
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
      noValidate
    >
      <div className="space-y-1.5">
        <Label htmlFor="new_password">New password</Label>
        <Input
          id="new_password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          minLength={8}
          autoComplete="new-password"
          required
        />
        <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm_password">Confirm password</Label>
        <Input
          id="confirm_password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          minLength={8}
          autoComplete="new-password"
          required
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
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> Updating…
          </>
        ) : (
          "Update password"
        )}
      </Button>
    </form>
  );
}
