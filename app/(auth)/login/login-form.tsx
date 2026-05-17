"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const DEMO_CREDS = [
  {
    role: "Admin",
    email: "admin@atomquest.demo",
    description: "Full access — cycles, users, audit log",
    accent: "from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400",
  },
  {
    role: "Manager",
    email: "maya.patel@atomquest.demo",
    description: "Engineering team — approvals & check-ins",
    accent: "from-indigo-500/15 to-indigo-500/5 text-indigo-600 dark:text-indigo-400",
  },
  {
    role: "Employee",
    email: "priya.iyer@atomquest.demo",
    description: "Goal sheet locked, Q1 actuals filled",
    accent: "from-emerald-500/15 to-emerald-500/5 text-emerald-600 dark:text-emerald-400",
  },
] as const;

const DEMO_PASSWORD = "Atomquest!2026";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  function signIn(emailOverride?: string, passwordOverride?: string) {
    const e = emailOverride ?? email;
    const p = passwordOverride ?? password;
    if (!e || !p) {
      toast.error("Email and password are required");
      return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: e, password: p });
      if (error) {
        toast.error(error.message);
        return;
      }
      const from = searchParams.get("from") ?? "/dashboard";
      router.replace(from);
      router.refresh();
    });
  }

  function signInWithMicrosoft() {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "azure",
        options: {
          scopes: "email openid profile offline_access",
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) toast.error(error.message);
    });
  }

  // A `from` param means middleware redirected the user here — either their
  // session expired or they tried to access a protected route while signed out.
  const redirectedFrom = searchParams.get("from");
  const showSessionBanner = !!redirectedFrom && redirectedFrom !== "/";

  return (
    <div className="space-y-6">
      {showSessionBanner && (
        <div className="flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Your session has expired or you were signed out. Please sign in again to continue.
          </span>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          signIn();
        }}
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="#" className="text-xs text-muted-foreground hover:text-foreground">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          disabled={isPending}
          onClick={signInWithMicrosoft}
        >
          <MicrosoftLogo className="h-4 w-4" />
          Sign in with Microsoft
        </Button>
      </form>

      <Card className="border-dashed bg-muted/30 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Demo accounts
          </p>
          <span className="text-[10px] text-muted-foreground">
            password: <code className="font-mono">{DEMO_PASSWORD}</code>
          </span>
        </div>
        <div className="grid gap-2">
          {DEMO_CREDS.map((cred) => (
            <button
              key={cred.role}
              type="button"
              disabled={isPending}
              onClick={() => {
                setEmail(cred.email);
                setPassword(DEMO_PASSWORD);
                signIn(cred.email, DEMO_PASSWORD);
              }}
              className={cn(
                "group flex items-center justify-between rounded-lg border bg-gradient-to-r p-3 text-left transition hover:border-primary/40",
                cred.accent
              )}
            >
              <div>
                <div className="text-sm font-medium text-foreground">{cred.role}</div>
                <div className="text-xs text-muted-foreground">{cred.description}</div>
              </div>
              <div className="text-xs font-medium opacity-80 group-hover:opacity-100">
                Try as {cred.role} →
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MicrosoftLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 23 23" className={className} aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" fill="#f25022" />
      <rect x="12" y="1" width="10" height="10" fill="#7fba00" />
      <rect x="1" y="12" width="10" height="10" fill="#00a4ef" />
      <rect x="12" y="12" width="10" height="10" fill="#ffb900" />
    </svg>
  );
}
