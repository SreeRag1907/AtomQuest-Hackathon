"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — render the inert icon until next-themes has
  // resolved the active theme client-side.
  useEffect(() => setMounted(true), []);

  const active = mounted ? theme ?? "system" : "system";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          {mounted && resolvedTheme === "dark" ? (
            <Moon className="h-4 w-4" aria-hidden />
          ) : (
            <Sun className="h-4 w-4" aria-hidden />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          aria-pressed={active === "light"}
          onClick={() => setTheme("light")}
        >
          <Sun className="mr-2 h-4 w-4" aria-hidden /> Light
        </DropdownMenuItem>
        <DropdownMenuItem
          aria-pressed={active === "dark"}
          onClick={() => setTheme("dark")}
        >
          <Moon className="mr-2 h-4 w-4" aria-hidden /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          aria-pressed={active === "system"}
          onClick={() => setTheme("system")}
        >
          <Monitor className="mr-2 h-4 w-4" aria-hidden /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
