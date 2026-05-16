import Link from "next/link";
import { Atom } from "lucide-react";
import { SignupForm } from "./signup-form";

export default function SignupPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Atom className="h-6 w-6" />
          AtomQuest
        </div>
        <div className="space-y-6">
          <h1 className="text-4xl font-semibold tracking-tight">Create your account</h1>
          <p className="max-w-md text-indigo-100">
            In production, account provisioning is admin-only. For the demo, sign-up is
            open so you can explore freely.
          </p>
        </div>
        <div className="text-xs text-indigo-200">
          &copy; {new Date().getFullYear()} AtomQuest Portal
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-2xl font-semibold tracking-tight">Sign up</h2>
            <p className="text-sm text-muted-foreground">It only takes a minute.</p>
          </div>

          <SignupForm />

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
