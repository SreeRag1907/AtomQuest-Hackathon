"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Atom, PanelLeftClose, PanelLeftOpen, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NAV_SECTIONS, isNavItemActive } from "@/lib/navigation";
import type { Profile } from "@/types/database";

interface SidebarProps {
  profile: Profile;
}

export function Sidebar({ profile }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const allHrefs = NAV_SECTIONS.flatMap((s) => s.items.map((it) => it.href));

  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-card transition-[width] md:flex",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className={cn("flex h-14 items-center px-4", collapsed && "justify-center px-0")}>
        {!collapsed ? (
          <Link href="/dashboard" className="flex items-center gap-2 text-base font-semibold">
            <Atom className="h-5 w-5 text-primary" />
            AtomQuest
          </Link>
        ) : (
          <Link href="/dashboard" aria-label="AtomQuest home">
            <Atom className="h-5 w-5 text-primary" />
          </Link>
        )}
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 pb-4 pt-2" aria-label="Primary">
        {NAV_SECTIONS.map((section, idx) => {
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
                  const active = isNavItemActive(allHrefs, pathname, item.href);
                  const link = (
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
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
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" aria-hidden />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" aria-hidden />
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
