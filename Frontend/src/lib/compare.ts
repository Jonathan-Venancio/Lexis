import type { LineMatch } from "@/types";

export interface ComparedLine {
  index: number;
  original: string;
  mine: string;
  reference: string;
  match: LineMatch;
}

export interface ComparisonStats {
  correct: number;
  close: number;
  different: number;
  missing: number;
  total: number;
  correctPct: number;
  closePct: number;
  differentPct: number;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Lightweight, deterministic line comparison used to demonstrate the
 * Correct / Close / Different states. This is intentionally simple — a
 * future backend could replace it with a smarter evaluation.
 */
export function compareLine(mine: string, reference: string): LineMatch {
  const a = norm(mine);
  const b = norm(reference);
  if (!a) return "missing";
  if (a === b) return "correct";
  const wa = new Set(a.split(" "));
  const wb = b.split(" ");
  if (wb.length === 0) return "different";
  const overlap = wb.filter((w) => wa.has(w)).length / Math.max(wb.length, wa.size);
  return overlap >= 0.5 ? "close" : "different";
}

export function splitLines(text: string): string[] {
  return text.replace(/\r/g, "").split("\n").map((l) => l.trimEnd());
}

export function compareTranslations(
  lyrics: string,
  mine: string,
  reference: string,
): { lines: ComparedLine[]; stats: ComparisonStats } {
  const o = splitLines(lyrics);
  const m = splitLines(mine);
  const r = splitLines(reference);
  const lines: ComparedLine[] = o.map((original, i) => ({
    index: i,
    original,
    mine: m[i] ?? "",
    reference: r[i] ?? "",
    match: original.trim() === "" ? "correct" : compareLine(m[i] ?? "", r[i] ?? ""),
  }));
  const scored = lines.filter((l) => l.original.trim() !== "");
  const count = (k: LineMatch) => scored.filter((l) => l.match === k).length;
  const total = scored.length || 1;
  const stats: ComparisonStats = {
    correct: count("correct"),
    close: count("close"),
    different: count("different"),
    missing: count("missing"),
    total: scored.length,
    correctPct: Math.round((count("correct") / total) * 100),
    closePct: Math.round((count("close") / total) * 100),
    differentPct: Math.round(((count("different") + count("missing")) / total) * 100),
  };
  return { lines, stats };
}
