import { format as dfFormat, formatDistanceToNow as dfFormatDistance } from "date-fns";

/**
 * Standard formatters so every screen renders dates the same way.
 * Defaults to `Mar 14, 2025` and `Mar 14, 2025 09:32`.
 */

export type DateInput = Date | string | number | null | undefined;

function toDate(value: DateInput): Date | null {
  if (value == null) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value: DateInput, fallback = "—"): string {
  const d = toDate(value);
  return d ? dfFormat(d, "MMM d, yyyy") : fallback;
}

export function formatDateTime(value: DateInput, fallback = "—"): string {
  const d = toDate(value);
  return d ? dfFormat(d, "MMM d, yyyy HH:mm") : fallback;
}

export function formatTime(value: DateInput, fallback = "—"): string {
  const d = toDate(value);
  return d ? dfFormat(d, "HH:mm") : fallback;
}

export function formatRelative(value: DateInput, fallback = "—"): string {
  const d = toDate(value);
  return d ? dfFormatDistance(d, { addSuffix: true }) : fallback;
}

export function formatRange(start: DateInput, end: DateInput, fallback = "—"): string {
  const s = formatDate(start, "");
  const e = formatDate(end, "");
  if (!s && !e) return fallback;
  if (!s) return e;
  if (!e) return s;
  return `${s} – ${e}`;
}
