import type { ReviewGrade, Word, WordStatus } from "@/types";

/** Simplified Anki-like ladder (in days). */
export const INTERVAL_LADDER = [1, 3, 7, 14, 30, 60];

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

function ladderIndex(intervalDays: number): number {
  let idx = -1;
  for (let i = 0; i < INTERVAL_LADDER.length; i++) {
    if (intervalDays >= INTERVAL_LADDER[i]) idx = i;
  }
  return idx;
}

function ladderAt(idx: number): number {
  return INTERVAL_LADDER[Math.min(Math.max(idx, 0), INTERVAL_LADDER.length - 1)];
}

export interface ScheduleResult {
  intervalDays: number;
  /** milliseconds until next review */
  delayMs: number;
  status: WordStatus;
}

/** Compute the next schedule for a word given a grade. Pure function. */
export function schedule(word: Word, grade: ReviewGrade): ScheduleResult {
  const idx = ladderIndex(word.intervalDays);

  if (grade === "again") {
    return { intervalDays: 0, delayMs: 1 * MINUTE, status: "learning" };
  }

  if (grade === "hard") {
    if (idx < 0) return { intervalDays: 0, delayMs: 6 * MINUTE, status: "learning" };
    const days = ladderAt(idx);
    return { intervalDays: days, delayMs: days * DAY, status: statusFor(days) };
  }

  if (grade === "good") {
    const days = ladderAt(idx + 1);
    return { intervalDays: days, delayMs: days * DAY, status: statusFor(days) };
  }

  // easy
  if (idx < 0) return { intervalDays: 4, delayMs: 4 * DAY, status: "review" };
  const days = ladderAt(idx + 2);
  return { intervalDays: days, delayMs: days * DAY, status: statusFor(days) };
}

function statusFor(days: number): WordStatus {
  if (days >= 30) return "mastered";
  if (days >= 1) return "review";
  return "learning";
}

export function applyGrade(word: Word, grade: ReviewGrade, now = new Date()): Word {
  const s = schedule(word, grade);
  const success = grade === "good" || grade === "easy";
  const difficulty = Math.min(
    5,
    Math.max(1, word.difficulty + (grade === "again" ? 1 : grade === "hard" ? 0.5 : grade === "easy" ? -1 : -0.5)),
  );
  return {
    ...word,
    difficulty,
    reviewCount: word.reviewCount + 1,
    successCount: word.successCount + (success ? 1 : 0),
    lastReviewedAt: now.toISOString(),
    nextReviewAt: new Date(now.getTime() + s.delayMs).toISOString(),
    intervalDays: s.intervalDays,
    status: s.status,
    lastGrade: grade,
  };
}

/** Human label for the interval a grade would produce, e.g. "< 1 min", "6 min", "1 day". */
export function previewInterval(word: Word, grade: ReviewGrade): string {
  const s = schedule(word, grade);
  const mins = Math.round(s.delayMs / MINUTE);
  if (mins < 1.5) return "< 1 min";
  if (mins < 60) return `${mins} min`;
  const days = Math.round(s.delayMs / DAY);
  if (days === 1) return "1 day";
  if (days < 30) return `${days} days`;
  if (days < 60) return "1 month";
  return `${Math.round(days / 30)} months`;
}

export function isDue(word: Word, now = new Date()): boolean {
  return new Date(word.nextReviewAt).getTime() <= now.getTime();
}

export function dueWords(words: Word[], now = new Date()): Word[] {
  return words
    .filter((w) => isDue(w, now))
    .sort((a, b) => new Date(a.nextReviewAt).getTime() - new Date(b.nextReviewAt).getTime());
}

export function successRate(word: Word): number {
  if (word.reviewCount === 0) return 0;
  return Math.round((word.successCount / word.reviewCount) * 100);
}
