import Link from "next/link";
import { Atom, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

const MESSAGES: Record<string, { title: string; body: string }> = {
  no_profile: {
    title: "Account not provisioned",
    body:
      "We couldn't find a profile for this account. Ask your administrator to invite you, then sign in again.",
  },
  deactivated: {
    title: "Account deactivated",
    body:
      "This account has been deactivated. Contact your administrator if you believe this is a mistake.",
  },
  insufficient_role: {
    title: "Insufficient permissions",
    body: "Your role does not allow access to that page.",
  },
  profile_sync_failed: {
    title: "Profile sync failed",
    body:
      "We signed you in, but couldn't sync your profile. Try signing in again, or contact support if the problem persists.",
  },
  default: {
    title: "Something went wrong",
    body:
      "We hit an unexpected error during sign-in. Try again, or contact support if the problem persists.",
  },
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const msg = MESSAGES[code ?? "default"] ?? MESSAGES.default;

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 py-12">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex items-center justify-center gap-2 text-lg font-semibold">
          <Atom className="h-5 w-5 text-primary" />
          AtomQuest
        </div>

        <div className="space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">{msg.title}</h1>
          <p className="text-sm text-muted-foreground">{msg.body}</p>
        </div>

        <div className="flex flex-col gap-2">
          <Button asChild>
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
