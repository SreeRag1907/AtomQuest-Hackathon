import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserMenu } from "@/components/layout/user-menu";
import { NotificationsBell } from "@/components/layout/notifications-bell";
import type { Profile } from "@/types/database";

interface TopbarProps {
  profile: Profile;
}

export function Topbar({ profile }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-6 backdrop-blur">
      <Breadcrumbs />
      <div className="flex items-center gap-1.5">
        <ThemeToggle />
        <NotificationsBell userId={profile.id} />
        <UserMenu profile={profile} />
      </div>
    </header>
  );
}
