import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/auth";

export default async function NotFound() {
  const user = await getSession();
  const href = user ? "/dashboard" : "/login";
  const label = user ? "Back to dashboard" : "Sign in";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">404</h1>
      <p className="text-sm text-muted-foreground">
        That page either doesn&apos;t exist or you don&apos;t have access to it.
      </p>
      <Button asChild>
        <Link href={href}>{label}</Link>
      </Button>
    </div>
  );
}
