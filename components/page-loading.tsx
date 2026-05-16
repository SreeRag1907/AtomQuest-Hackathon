import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading({
  variant = "default",
  className,
}: {
  variant?: "default" | "form" | "table" | "charts" | "detail" | "kanban";
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      <PageHeaderSkeleton />
      {variant === "default" && <DefaultBlocks />}
      {variant === "form" && <FormBlocks />}
      {variant === "table" && <TableBlocks />}
      {variant === "charts" && <ChartsBlocks />}
      {variant === "detail" && <DetailBlocks />}
      {variant === "kanban" && <KanbanBlocks />}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-9 w-32" />
    </div>
  );
}

export function KpiRowSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className={cn(
        "grid gap-4",
        count === 4 && "sm:grid-cols-2 lg:grid-cols-4",
        count === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        count === 2 && "sm:grid-cols-2"
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-5">
          <Skeleton className="mb-3 h-3 w-24" />
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 8,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid gap-3 border-b bg-muted/30 px-4 py-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} className="h-3 w-20" />
        ))}
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid gap-3 px-4 py-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}
          >
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={cn("h-4", c === 0 ? "w-full" : "w-3/4")} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function DefaultBlocks() {
  return (
    <>
      <Skeleton className="h-20 w-full" />
      <KpiRowSkeleton />
      <Skeleton className="h-72 w-full" />
    </>
  );
}

function FormBlocks() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <Skeleton className="mb-4 h-5 w-40" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-20 sm:col-span-2 lg:col-span-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TableBlocks() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-32" />
        <div className="flex-1" />
        <Skeleton className="h-9 w-32" />
      </div>
      <TableSkeleton />
    </div>
  );
}

function ChartsBlocks() {
  return (
    <>
      <KpiRowSkeleton />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      <Skeleton className="h-80 w-full" />
    </>
  );
}

function DetailBlocks() {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-32 lg:col-span-2" />
        <Skeleton className="h-32" />
      </div>
      <TableSkeleton rows={5} />
    </div>
  );
}

function KanbanBlocks() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, col) => (
        <div key={col} className="space-y-3 rounded-lg border bg-muted/30 p-3">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 3 }).map((_, r) => (
            <div key={r} className="rounded-md border bg-card p-3">
              <Skeleton className="mb-2 h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function InlineSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4 animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
