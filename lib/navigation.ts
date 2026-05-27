import {
  AlertTriangle,
  BarChart3,
  CheckSquare,
  Clipboard,
  ClipboardList,
  FileText,
  History,
  Home,
  ScrollText,
  Settings as SettingsIcon,
  Sparkles,
  Tag,
  Unlock,
  Users,
  Users2,
} from "lucide-react";
import type { UserRole } from "@/types/database";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
  /** Optional grouping label used by the command palette. */
  paletteGroup?: string;
  /** Optional pretty long label for breadcrumbs / palette when label is too terse. */
  longLabel?: string;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: Home, paletteGroup: "Navigate" },
      {
        href: "/goals",
        label: "My goals",
        icon: Clipboard,
        roles: ["employee", "manager"],
        paletteGroup: "Navigate",
      },
      {
        href: "/check-ins",
        label: "Check-ins",
        icon: CheckSquare,
        roles: ["employee", "manager"],
        paletteGroup: "Navigate",
      },
    ],
  },
  {
    title: "Manager",
    items: [
      {
        href: "/team",
        label: "Team",
        icon: Users,
        roles: ["manager", "admin"],
        paletteGroup: "Manager",
      },
      {
        href: "/team/approvals",
        label: "Approvals",
        icon: ClipboardList,
        roles: ["manager", "admin"],
        paletteGroup: "Manager",
      },
    ],
  },
  {
    title: "Reports",
    items: [
      {
        href: "/reports/achievement",
        label: "Achievement",
        icon: FileText,
        paletteGroup: "Reports",
      },
      {
        href: "/reports/completion",
        label: "Completion",
        icon: BarChart3,
        paletteGroup: "Reports",
      },
      {
        href: "/analytics",
        label: "Analytics",
        icon: Sparkles,
        paletteGroup: "Reports",
      },
    ],
  },
  {
    title: "Admin",
    items: [
      {
        href: "/admin/cycles",
        label: "Cycles",
        icon: History,
        roles: ["admin"],
        paletteGroup: "Admin",
      },
      {
        href: "/admin/users",
        label: "Users",
        icon: Users2,
        roles: ["admin"],
        paletteGroup: "Admin",
      },
      {
        href: "/admin/thrust-areas",
        label: "Thrust areas",
        icon: Tag,
        roles: ["admin"],
        paletteGroup: "Admin",
      },
      {
        href: "/admin/audit-log",
        label: "Audit log",
        icon: ScrollText,
        roles: ["admin"],
        paletteGroup: "Admin",
      },
      {
        href: "/admin/unlock-requests",
        label: "Unlock requests",
        icon: Unlock,
        roles: ["admin"],
        paletteGroup: "Admin",
      },
      {
        href: "/admin/escalation",
        label: "Escalation",
        icon: AlertTriangle,
        roles: ["admin"],
        paletteGroup: "Admin",
      },
    ],
  },
  {
    items: [
      {
        href: "/settings",
        label: "Settings",
        icon: SettingsIcon,
        paletteGroup: "Account",
      },
    ],
  },
];

/** Flat list of palette-eligible items including a few action-only commands. */
export const PALETTE_ACTIONS: NavItem[] = [
  {
    href: "/goals/new",
    label: "Create goal sheet",
    icon: Clipboard,
    roles: ["employee", "manager"],
    paletteGroup: "Actions",
  },
];

/**
 * Decide if a sidebar item should appear active. Longest-prefix wins among
 * the same section so `/team/approvals` highlights only Approvals, not Team.
 */
export function isNavItemActive(allHrefs: string[], pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  if (!pathname.startsWith(`${href}/`) && pathname !== href) return false;
  // Among items whose href is a prefix of pathname, only the longest wins.
  const matching = allHrefs.filter(
    (h) => h !== "/dashboard" && (pathname === h || pathname.startsWith(`${h}/`))
  );
  if (matching.length === 0) return false;
  const longest = matching.reduce((a, b) => (a.length >= b.length ? a : b));
  return longest === href;
}

export function visibleNavItems(role: UserRole): NavItem[] {
  return NAV_SECTIONS.flatMap((s) => s.items).filter(
    (it) => !it.roles || it.roles.includes(role)
  );
}
