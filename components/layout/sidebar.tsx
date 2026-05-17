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
  PanelLeftClose,
  PanelLeftOpen,
  ScrollText,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Tag,
  Unlock,
  Users,
  Users2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Profile, UserRole } from "@/types/database";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
  badge?: string;
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
      {
        href: "/team/approvals",
        label: "Approvals",
        icon: ClipboardList,
        roles: ["manager", "admin"],
      },
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

interface SidebarProps {
  profile: Profile;
}

export function Sidebar({ profile }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-card transition-[width] md:flex",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className={cn("flex h-14 items-center px-4", collapsed && "justify-center px-0")}>
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2 text-base font-semibold">
            <Atom className="h-5 w-5 text-primary" />
            AtomQuest
          </Link>
        )}
        {collapsed && (
          <Link href="/dashboard" aria-label="AtomQuest home">
            <Atom className="h-5 w-5 text-primary" />
          </Link>
        )}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 pb-4 pt-2">
        {NAV.map((section, idx) => {
          const allowedItems = section.items.filter(
            (it) => !it.roles || it.roles.includes(profile.role)
          );
          if (allowedItems.length === 0) return null;
          return (
            <div key={idx}>
              {!collapsed && section.title && (
                <div className="px-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {section.title}
                </div>
              )}
              <ul className="space-y-0.5">
                {allowedItems.map((item) => {
                  const Icon = item.icon;
                  const active =
                    pathname === item.href ||
                    (item.href !== "/dashboard" && pathname.startsWith(item.href));
                  const link = (
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                        collapsed && "justify-center px-0"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                  return (
                    <li key={item.href}>
                      {collapsed ? (
                        <Tooltip>
                          <TooltipTrigger asChild>{link}</TooltipTrigger>
                          <TooltipContent side="right">{item.label}</TooltipContent>
                        </Tooltip>
                      ) : (
                        link
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t p-2">
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span>Collapse</span>
            </>
          )}
        </button>
        {!collapsed && (
          <div className="mt-2 flex items-center gap-1 px-2.5 text-[10px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3" />
            Role-secured
          </div>
        )}
      </div>
    </aside>
  );
}
