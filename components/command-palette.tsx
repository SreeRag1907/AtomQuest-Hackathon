"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  CheckSquare,
  Clipboard,
  ClipboardList,
  FileText,
  History as HistoryIcon,
  Home,
  Sparkles,
  Tag,
  Unlock,
  Users,
  Users2,
  ScrollText,
  Settings,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { UserRole } from "@/types/database";

interface PaletteItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: string;
  roles?: UserRole[];
}

const ITEMS: PaletteItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home, group: "Navigate" },
  {
    href: "/goals",
    label: "My goals",
    icon: Clipboard,
    group: "Navigate",
    roles: ["employee", "manager"],
  },
  {
    href: "/goals/new",
    label: "Create goal sheet",
    icon: Clipboard,
    group: "Actions",
    roles: ["employee", "manager"],
  },
  {
    href: "/check-ins",
    label: "Current check-in",
    icon: CheckSquare,
    group: "Navigate",
    roles: ["employee", "manager"],
  },
  {
    href: "/check-ins/history",
    label: "Check-in history",
    icon: HistoryIcon,
    group: "Navigate",
    roles: ["employee", "manager"],
  },
  { href: "/team", label: "Team", icon: Users, group: "Manager", roles: ["manager", "admin"] },
  { href: "/team/approvals", label: "Approvals queue", icon: ClipboardList, group: "Manager", roles: ["manager", "admin"] },
  { href: "/reports/achievement", label: "Achievement report", icon: FileText, group: "Reports" },
  { href: "/reports/completion", label: "Completion report", icon: BarChart3, group: "Reports" },
  { href: "/analytics", label: "Analytics", icon: Sparkles, group: "Reports" },
  { href: "/admin/cycles", label: "Cycles", icon: HistoryIcon, group: "Admin", roles: ["admin"] },
  { href: "/admin/users", label: "Users", icon: Users2, group: "Admin", roles: ["admin"] },
  { href: "/admin/thrust-areas", label: "Thrust areas", icon: Tag, group: "Admin", roles: ["admin"] },
  { href: "/admin/audit-log", label: "Audit log", icon: ScrollText, group: "Admin", roles: ["admin"] },
  { href: "/admin/unlock-requests", label: "Unlock requests", icon: Unlock, group: "Admin", roles: ["admin"] },
  { href: "/settings", label: "Settings", icon: Settings, group: "Account" },
];

interface Props {
  role: UserRole;
}

export function CommandPalette({ role }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const visible = ITEMS.filter((i) => !i.roles || i.roles.includes(role));
  const groups = Array.from(new Set(visible.map((i) => i.group)));

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        {groups.map((g, idx) => (
          <span key={g}>
            <CommandGroup heading={g}>
              {visible
                .filter((i) => i.group === g)
                .map((i) => {
                  const Icon = i.icon;
                  return (
                    <CommandItem
                      key={i.href}
                      onSelect={() => {
                        setOpen(false);
                        router.push(i.href);
                      }}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      {i.label}
                    </CommandItem>
                  );
                })}
            </CommandGroup>
            {idx < groups.length - 1 && <CommandSeparator />}
          </span>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
