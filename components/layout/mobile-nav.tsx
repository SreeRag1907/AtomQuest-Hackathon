"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Atom, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NAV_SECTIONS, isNavItemActive } from "@/lib/navigation";
import type { Profile } from "@/types/database";

export function MobileNav({ profile }: { profile: Profile }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const allHrefs = NAV_SECTIONS.flatMap((s) => s.items.map((it) => it.href));

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu className="h-5 w-5" aria-hidden />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="flex h-14 items-center gap-2 border-b px-4 text-base font-semibold">
          <Atom className="h-5 w-5 text-primary" aria-hidden />
          AtomQuest
        </SheetTitle>
        <nav className="space-y-4 overflow-y-auto px-2 pb-4 pt-2" aria-label="Primary">
          {NAV_SECTIONS.map((section, idx) => {
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
                    const active = isNavItemActive(allHrefs, pathname, item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setOpen(false)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" aria-hidden />
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
