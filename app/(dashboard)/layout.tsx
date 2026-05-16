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
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar profile={profile} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar profile={profile} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl px-6 py-8">{children}</div>
          </main>
        </div>
        <CommandPalette role={profile.role} />
      </div>
    </TooltipProvider>
  );
}
