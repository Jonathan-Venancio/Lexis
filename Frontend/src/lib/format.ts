import { differenceInCalendarDays, format, isToday, isTomorrow, isYesterday } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import type { Locale, Messages } from "@/i18n";
import { schedule } from "@/lib/srs";
import type { ReviewGrade, Word } from "@/types";

function dateFnsLocale(locale: Locale) {
  return locale === "en" ? enUS : ptBR;
}

export function greeting(name: string, t: Messages): string {
  const hour = new Date().getHours();
  if (hour < 12) return t.greeting.morning(name);
  if (hour < 18) return t.greeting.afternoon(name);
  return t.greeting.evening(name);
}

export function formatRelativeDay(iso: string, t: Messages, locale: Locale): string {
  const date = new Date(iso);
  if (isToday(date)) return t.dates.today;
  if (isYesterday(date)) return t.dates.yesterday;
  if (isTomorrow(date)) return t.dates.tomorrow;
  const diff = differenceInCalendarDays(date, new Date());
  if (diff > 1 && diff < 30) return t.dates.inDays(diff);
  if (diff < -1 && diff > -30) return t.dates.daysAgo(Math.abs(diff));
  return format(date, t.dates.shortPattern, { locale: dateFnsLocale(locale) });
}

export function formatNextReview(iso: string, t: Messages, locale: Locale): string {
  if (new Date(iso).getTime() <= Date.now()) return t.dates.dueNow;
  return formatRelativeDay(iso, t, locale);
}

export function formatLongDate(iso: string, t: Messages, locale: Locale): string {
  return format(new Date(iso), t.dates.longPattern, { locale: dateFnsLocale(locale) });
}

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

export function formatPreview(word: Word, grade: ReviewGrade, t: Messages): string {
  const next = schedule(word, grade);
  const minutes = Math.round(next.delayMs / MINUTE);
  if (minutes < 1.5) return t.interval.underMinute;
  if (minutes < 60) return t.interval.minutes(minutes);
  const days = Math.round(next.delayMs / DAY);
  if (days === 1) return t.interval.oneDay;
  if (days < 30) return t.interval.days(days);
  if (days < 60) return t.interval.oneMonth;
  return t.interval.months(Math.round(days / 30));
}
