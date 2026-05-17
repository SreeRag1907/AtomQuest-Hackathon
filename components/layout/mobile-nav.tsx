"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Atom,
  BarChart3,
  CheckSquare,
  Clipboard,
  ClipboardList,
  FileText,
  History,
  Home,
  Menu,
  ScrollText,
  Settings as SettingsIcon,
  Tag,
  Unlock,
  Users,
  Users2,
  Sparkles,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Profile, UserRole } from "@/types/database";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const NAV: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Home },
      { href: "/goals", label: "My goals", icon: Clipboard },
      { href: "/check-ins", label: "Check-ins", icon: CheckSquare },
    ],
  },
  {
    title: "Manager",
    items: [
      { href: "/team", label: "Team", icon: Users, roles: ["manager", "admin"] },
      { href: "/team/approvals", label: "Approvals", icon: ClipboardList, roles: ["manager", "admin"] },
    ],
  },
  {
    title: "Reports",
    items: [
      { href: "/reports/achievement", label: "Achievement", icon: FileText },
      { href: "/reports/completion", label: "Completion", icon: BarChart3 },
      { href: "/analytics", label: "Analytics", icon: Sparkles },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/admin/cycles", label: "Cycles", icon: History, roles: ["admin"] },
      { href: "/admin/users", label: "Users", icon: Users2, roles: ["admin"] },
      { href: "/admin/thrust-areas", label: "Thrust areas", icon: Tag, roles: ["admin"] },
      { href: "/admin/audit-log", label: "Audit log", icon: ScrollText, roles: ["admin"] },
      { href: "/admin/unlock-requests", label: "Unlock requests", icon: Unlock, roles: ["admin"] },
      { href: "/admin/escalation", label: "Escalation", icon: AlertTriangle, roles: ["admin"] },
    ],
  },
  {
    items: [
      { href: "/settings", label: "Settings", icon: SettingsIcon },
    ],
  },
];

export function MobileNav({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex h-14 items-center gap-2 border-b px-4 text-base font-semibold">
          <Atom className="h-5 w-5 text-primary" />
          AtomQuest
        </div>
        <nav className="space-y-4 overflow-y-auto px-2 pb-4 pt-2">
          {NAV.map((section, idx) => {
            const allowed = section.items.filter(
              (it) => !it.roles || it.roles.includes(profile.role)
            );
            if (allowed.length === 0) return null;
            return (
              <div key={idx}>
                {section.title && (
                  <div className="px-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {section.title}
                  </div>
                )}
                <ul className="space-y-0.5">
                  {allowed.map((item) => {
                    const Icon = item.icon;
                    const active =
                      pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
