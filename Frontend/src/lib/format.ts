import { differenceInCalendarDays, format, isToday, isYesterday, isTomorrow } from "date-fns";
import type { WordStatus } from "@/types";

export function formatRelativeDay(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  if (isTomorrow(d)) return "Tomorrow";
  const diff = differenceInCalendarDays(d, new Date());
  if (diff > 1 && diff < 30) return `In ${diff} days`;
  if (diff < -1 && diff > -30) return `${Math.abs(diff)} days ago`;
  return format(d, "MMM d");
}

export function formatNextReview(iso: string): string {
  const d = new Date(iso);
  if (d.getTime() <= Date.now()) return "Due now";
  return formatRelativeDay(iso);
}

export function formatLongDate(iso: string): string {
  return format(new Date(iso), "MMMM d");
}

export function statusLabel(status: WordStatus): string {
  return { new: "New", learning: "Learning", review: "Review", mastered: "Mastered" }[status];
}

export function greeting(name: string): string {
  const h = new Date().getHours();
  const part = h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
  return `Good ${part}, ${name}`;
}

export function pluralize(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}
