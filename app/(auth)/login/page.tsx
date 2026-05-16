import { Suspense } from "react";
import Link from "next/link";
import { Atom, Sparkles } from "lucide-react";
import { LoginForm } from "./login-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Atom className="h-6 w-6" />
          AtomQuest
        </div>

        <div className="space-y-6">
          <h1 className="text-4xl font-semibold tracking-tight">
            Goals that move the needle, not the paperwork.
          </h1>
          <p className="max-w-md text-indigo-100">
            Set objectives, track progress through the year, and run quarterly check-ins
            with audit-grade governance built in.
          </p>
          <div className="flex items-center gap-2 text-sm text-indigo-200">
            <Sparkles className="h-4 w-4" />
            Demo credentials available — click and go.
          </div>
        </div>

        <div className="text-xs text-indigo-200">
          &copy; {new Date().getFullYear()} AtomQuest Portal
        </div>

        {/* Decorative gradient orbs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-indigo-400/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl"
        />
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center lg:text-left">
            <div className="flex items-center justify-center gap-2 text-lg font-semibold lg:hidden">
              <Atom className="h-5 w-5 text-primary" />
              AtomQuest
            </div>
            <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in to continue to your portal.</p>
          </div>

          <Suspense fallback={<LoginFormSkeleton />}>
            <LoginForm />
          </Suspense>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" />
    </div>
  );
}
