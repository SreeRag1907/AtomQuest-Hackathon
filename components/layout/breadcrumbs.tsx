"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  goals: "My goals",
  new: "New",
  "check-ins": "Check-ins",
  history: "History",
  team: "Team",
  approvals: "Approvals",
  admin: "Admin",
  cycles: "Cycles",
  users: "Users",
  "thrust-areas": "Thrust areas",
  "audit-log": "Audit log",
  "unlock-requests": "Unlock requests",
  reports: "Reports",
  achievement: "Achievement",
  completion: "Completion",
  analytics: "Analytics",
  settings: "Settings",
};

function pretty(seg: string) {
  return LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1);
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  let acc = "";
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      {parts.map((seg, idx) => {
        acc += `/${seg}`;
        const isLast = idx === parts.length - 1;
        const looksLikeId = /^[0-9a-fA-F-]{20,}$/.test(seg);
        const label = looksLikeId ? "Detail" : pretty(seg);
        return (
          <span key={acc} className="flex items-center gap-1.5">
            {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
            {isLast ? (
              <span className="font-medium text-foreground">{label}</span>
            ) : (
              <Link
                href={acc}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
