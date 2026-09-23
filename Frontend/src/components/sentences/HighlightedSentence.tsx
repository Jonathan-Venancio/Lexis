import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useAppData } from "@/hooks/useAppData";
import { buildWordIndex, matchToken, tokenize } from "@/lib/text";
import { cn } from "@/lib/utils";

interface HighlightedSentenceProps {
  text: string;
  /** Emphasize this word above the others (e.g. on its own detail page). */
  highlightWordId?: string;
  /** Render recognized words as clickable chips that open the word page. */
  interactive?: boolean;
}

/**
 * Renders a sentence with vocabulary words visually marked.
 * Uses whole-token matching so "car" never matches "care" or "scar".
 */
export function HighlightedSentence({ text, highlightWordId, interactive }: HighlightedSentenceProps) {
  const { words } = useAppData();
  const index = useMemo(() => buildWordIndex(words), [words]);
  const tokens = useMemo(() => tokenize(text), [text]);

  return (
    <>
      {tokens.map((t, i) => {
        const word = t.isWord ? matchToken(t.key, index) : undefined;
        if (!word) return <span key={i}>{t.raw}</span>;
        const primary = word.id === highlightWordId;
        const cls = cn(
          "rounded-md px-1 -mx-0.5 font-bold transition-colors",
          primary ? "bg-grape text-grape-foreground" : "bg-sun/50 text-foreground",
          interactive && "cursor-pointer hover:bg-grape hover:text-grape-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        );
        if (!interactive) {
          return (
            <span key={i} className={cls}>
              {t.raw}
            </span>
          );
        }
        return (
          <Link
            key={i}
            to="/vocabulary/$wordId"
            params={{ wordId: word.id }}
            className={cls}
            title={`${word.term} — ${word.translation}`}
          >
            {t.raw}
          </Link>
        );
      })}
    </>
  );
}
