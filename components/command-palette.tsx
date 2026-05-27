"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { History as HistoryIcon } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { NAV_SECTIONS, PALETTE_ACTIONS, type NavItem } from "@/lib/navigation";
import type { UserRole } from "@/types/database";

interface Props {
  role: UserRole;
}

// Extra navigate-only commands beyond the sidebar (deep links)
const EXTRA_NAV: NavItem[] = [
  {
    href: "/check-ins/history",
    label: "Check-in history",
    icon: HistoryIcon,
    roles: ["employee", "manager"],
    paletteGroup: "Navigate",
  },
];

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

  const allItems: NavItem[] = [
    ...NAV_SECTIONS.flatMap((s) => s.items),
    ...EXTRA_NAV,
    ...PALETTE_ACTIONS,
  ];

  const visible = allItems.filter((i) => !i.roles || i.roles.includes(role));
  const groups = Array.from(
    new Set(visible.map((i) => i.paletteGroup ?? "Navigate"))
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        {groups.map((g, idx) => (
          <span key={g}>
            <CommandGroup heading={g}>
              {visible
                .filter((i) => (i.paletteGroup ?? "Navigate") === g)
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
                      <Icon className="mr-2 h-4 w-4" aria-hidden />
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
