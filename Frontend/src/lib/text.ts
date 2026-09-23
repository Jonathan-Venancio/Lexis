import type { Sentence, Word } from "@/types";

/** Canonical form used for duplicate detection and matching. */
export function normalizeWord(term: string): string {
  return term.trim().toLowerCase().replace(/\s+/g, " ");
}

export interface Token {
  raw: string;
  /** lowercase, punctuation stripped; empty for pure punctuation/whitespace */
  key: string;
  isWord: boolean;
}

/** Split a sentence into word and non-word tokens, preserving the original text. */
export function tokenize(text: string): Token[] {
  const parts = text.match(/[A-Za-zÀ-ÿ'’-]+|[^A-Za-zÀ-ÿ'’-]+/g) ?? [];
  return parts.map((raw) => {
    const isWord = /[A-Za-zÀ-ÿ]/.test(raw);
    const key = isWord ? raw.toLowerCase().replace(/^['’-]+|['’-]+$/g, "") : "";
    return { raw, key, isWord };
  });
}

/** Simple inflection candidates so "apples" / "changes" match "apple" / "change". */
function candidates(key: string): string[] {
  const out = [key];
  if (key.endsWith("ies")) out.push(key.slice(0, -3) + "y");
  if (key.endsWith("es")) out.push(key.slice(0, -2));
  if (key.endsWith("s")) out.push(key.slice(0, -1));
  if (key.endsWith("ed")) out.push(key.slice(0, -2), key.slice(0, -1));
  if (key.endsWith("ing")) out.push(key.slice(0, -3), key.slice(0, -3) + "e");
  return out;
}

export function buildWordIndex(words: Word[]): Map<string, Word> {
  const map = new Map<string, Word>();
  for (const w of words) map.set(normalizeWord(w.term), w);
  return map;
}

/** Return the vocabulary word matching a token, if any (whole-word match only). */
export function matchToken(key: string, index: Map<string, Word>): Word | undefined {
  for (const c of candidates(key)) {
    const hit = index.get(c);
    if (hit) return hit;
  }
  return undefined;
}

/** Does this sentence contain the word as a whole token? */
export function sentenceContainsWord(sentence: Sentence, word: Word): boolean {
  const target = normalizeWord(word.term);
  return tokenize(sentence.text).some(
    (t) => t.isWord && candidates(t.key).includes(target),
  );
}

export function findSentencesForWord(sentences: Sentence[], word: Word): Sentence[] {
  return sentences.filter((s) => sentenceContainsWord(s, word));
}

/** All vocabulary words that appear in a sentence (unique, in order of appearance). */
export function findWordsInSentence(sentence: Sentence, words: Word[]): Word[] {
  const index = buildWordIndex(words);
  const seen = new Set<string>();
  const out: Word[] = [];
  for (const t of tokenize(sentence.text)) {
    if (!t.isWord) continue;
    const w = matchToken(t.key, index);
    if (w && !seen.has(w.id)) {
      seen.add(w.id);
      out.push(w);
    }
  }
  return out;
}

/** Whole-token match, including simple inflections (apple/apples), never raw substrings. */
function tokenMatchesQuery(tokenKey: string, query: string): boolean {
  const queryKeys = new Set(candidates(query));
  return candidates(tokenKey).some((key) => queryKeys.has(key));
}

/**
 * Find sentences by a word or phrase fragment.
 * "apple" matches "apples", but "car" does not match "care" or "scar".
 */
export function searchSentences(sentences: Sentence[], words: Word[], query: string): Sentence[] {
  const q = normalizeWord(query);
  if (!q) return sentences;

  const matchedWords = words.filter((word) => {
    const term = normalizeWord(word.term);
    return term === q || candidates(q).includes(term) || candidates(term).includes(q);
  });

  return sentences.filter((sentence) => {
    if (matchedWords.some((word) => sentenceContainsWord(sentence, word))) return true;
    if (tokenize(sentence.text).some((token) => token.isWord && tokenMatchesQuery(token.key, q))) {
      return true;
    }
    const haystack = `${sentence.translation ?? ""} ${sentence.notes ?? ""}`.toLowerCase();
    return haystack.includes(q);
  });
}

export function countSentencesPerWord(sentences: Sentence[], words: Word[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const w of words) counts.set(w.id, 0);
  const index = buildWordIndex(words);
  for (const s of sentences) {
    const seen = new Set<string>();
    for (const t of tokenize(s.text)) {
      if (!t.isWord) continue;
      const w = matchToken(t.key, index);
      if (w && !seen.has(w.id)) {
        seen.add(w.id);
        counts.set(w.id, (counts.get(w.id) ?? 0) + 1);
      }
    }
  }
  return counts;
}
