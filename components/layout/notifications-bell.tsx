"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { formatRelative } from "@/lib/format/date";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { NotificationRow } from "@/types/database";

interface Props {
  userId: string;
}

export function NotificationsBell({ userId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    async function fetchInitial() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!cancelled) setNotifications((data ?? []) as NotificationRow[]);
    }
    fetchInitial();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as NotificationRow, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [supabase, userId]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  function markAllRead() {
    startTransition(async () => {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    });
  }

  function markRead(id: string) {
    startTransition(async () => {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="default" className="h-5 px-1.5 text-[10px]">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              disabled={isPending}
              onClick={markAllRead}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <CheckCheck className="mr-1 inline h-3 w-3" />
              Mark all read
            </button>
          )}
        </div>
        <ScrollArea className="max-h-[420px]">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              You're all caught up.
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => {
                const inner = (
                  <div
                    className={cn(
                      "flex items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent",
                      !n.is_read && "bg-primary/5"
                    )}
                  >
                    <div
                      className={cn(
                        "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        n.is_read ? "bg-transparent" : "bg-primary"
                      )}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">{n.title}</div>
                      {n.message && (
                        <div className="text-xs text-muted-foreground">{n.message}</div>
                      )}
                      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {formatRelative(n.created_at)}
                      </div>
                    </div>
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={() => {
                          if (!n.is_read) markRead(n.id);
                          setOpen(false);
                        }}
                        className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => !n.is_read && markRead(n.id)}
                        className="block w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
