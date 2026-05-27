import { Suspense } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/command-palette";
import { NavProgress } from "@/components/nav-progress";
import { requireProfile } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <TooltipProvider delayDuration={200}>
      <Suspense fallback={null}>
        <NavProgress />
      </Suspense>
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to main content
      </a>
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar profile={profile} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar profile={profile} />
          <main
            id="main-content"
            tabIndex={-1}
            className="flex-1 overflow-y-auto outline-none"
          >
            <div className="mx-auto w-full max-w-7xl px-6 py-8">{children}</div>
          </main>
        </div>
        <CommandPalette role={profile.role} />
      </div>
    </TooltipProvider>
  );
}
