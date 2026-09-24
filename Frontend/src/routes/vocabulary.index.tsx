import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpenText, Plus, Search } from "lucide-react";
import { useAppData } from "@/hooks/useAppData";
import { messagesFor, readLocale, useI18n } from "@/i18n";
import { normalizeWord, countSentencesPerWord } from "@/lib/text";
import { formatNextReview, formatRelativeDay } from "@/lib/format";
import { PageHeader, PageLoading } from "@/components/layout/AppShell";
import { WordStateBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { WordFormDialog } from "@/components/words/WordFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ReviewGrade } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vocabulary/")({
  head: () => {
    const copy = messagesFor(readLocale());
    return {
      meta: [
        { title: copy.meta.vocabulary },
        { name: "description", content: copy.meta.vocabularyDescription },
        { property: "og:title", content: copy.meta.vocabulary },
        { property: "og:description", content: copy.meta.vocabularyDescription },
      ],
    };
  },
  component: VocabularyPage,
});

type Filter = "all" | "new" | ReviewGrade;
type Sort = "recent" | "oldest" | "az" | "za" | "reviewed";

function VocabularyPage() {
  const { ready, words, sentences } = useAppData();
  const { t, locale } = useI18n();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [addOpen, setAddOpen] = useState(false);

  const counts = useMemo(() => countSentencesPerWord(sentences, words), [sentences, words]);

  const list = useMemo(() => {
    const q = normalizeWord(query);
    let out = words.filter((w) => {
      if (filter === "new" && (w.lastGrade || w.status !== "new")) return false;
      if (filter !== "all" && filter !== "new" && w.lastGrade !== filter) return false;
      if (!q) return true;
      return (
        normalizeWord(w.term).includes(q) ||
        w.translation.toLowerCase().includes(q) ||
        w.definition.toLowerCase().includes(q)
      );
    });
    out = [...out].sort((a, b) => {
      switch (sort) {
        case "recent":
          return b.createdAt.localeCompare(a.createdAt);
        case "oldest":
          return a.createdAt.localeCompare(b.createdAt);
        case "az":
          return a.term.localeCompare(b.term);
        case "za":
          return b.term.localeCompare(a.term);
        case "reviewed":
          return b.reviewCount - a.reviewCount;
      }
    });
    return out;
  }, [words, query, filter, sort]);

  if (!ready) return <PageLoading />;

  return (
    <div className="fade-up">
      <PageHeader
        title={t.vocab.title}
        description={t.vocab.count(words.length)}
        actions={
          <Button variant="pop" onClick={() => setAddOpen(true)}>
            <Plus /> {t.vocab.add}
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t.vocab.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 rounded-full bg-card pl-10"
            aria-label={t.vocab.searchLabel}
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger className="h-11 w-full rounded-full bg-card md:w-48" aria-label={t.vocab.sortLabel}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">{t.vocab.recent}</SelectItem>
            <SelectItem value="oldest">{t.vocab.oldest}</SelectItem>
            <SelectItem value="az">{t.vocab.az}</SelectItem>
            <SelectItem value="za">{t.vocab.za}</SelectItem>
            <SelectItem value="reviewed">{t.vocab.reviewed}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label={t.vocab.filterLabel}>
        {(["all", "new", "again", "hard", "good", "easy"] as const).map((value) => {
          const n =
            value === "all"
              ? words.length
              : words.filter((w) =>
                  value === "new" ? !w.lastGrade && w.status === "new" : w.lastGrade === value,
                ).length;
          const label = value === "all" ? t.vocab.all : value === "new" ? t.status.new : t.review[value];
          return (
            <button
              key={value}
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={cn(
                "cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filter === value
                  ? "bg-ink text-ink-foreground"
                  : "bg-card text-foreground hover:bg-card/70",
              )}
            >
              {label} <span className="ml-1 opacity-50">{n}</span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={BookOpenText}
          title={query ? t.vocab.noMatch(query) : t.vocab.empty}
          description={query ? t.vocab.noMatchHint : t.vocab.emptyHint}
          action={
            !query && (
              <Button variant="ink" onClick={() => setAddOpen(true)}>
                <Plus /> {t.vocab.add}
              </Button>
            )
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <div className="surface hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-5 py-3">{t.vocab.word}</th>
                  <th className="px-5 py-3">{t.vocab.translation}</th>
                  <th className="px-5 py-3">{t.vocab.pos}</th>
                  <th className="px-5 py-3">{t.vocab.status}</th>
                  <th className="px-5 py-3">{t.vocab.added}</th>
                  <th className="px-5 py-3">{t.vocab.next}</th>
                  <th className="px-5 py-3">{t.vocab.sentences}</th>
                </tr>
              </thead>
              <tbody>
                {list.map((w) => (
                  <tr key={w.id} className="group border-b border-border last:border-0 hover:bg-accent/60">
                    <td className="px-5 py-3">
                      <Link
                        to="/vocabulary/$wordId"
                        params={{ wordId: w.id }}
                        className="font-display text-base font-extrabold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                      >
                        {w.term}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{w.translation}</td>
                    <td className="px-5 py-3 text-muted-foreground">{w.partOfSpeech ? t.pos[w.partOfSpeech] : "—"}</td>
                    <td className="px-5 py-3">
                      <WordStateBadge word={w} />
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{formatRelativeDay(w.createdAt, t, locale)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{formatNextReview(w.nextReviewAt, t, locale)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{t.vocab.sentenceCount(counts.get(w.id) ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {list.map((w) => (
              <Link
                key={w.id}
                to="/vocabulary/$wordId"
                params={{ wordId: w.id }}
                className="surface block p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-lg font-extrabold">{w.term}</div>
                    <div className="text-sm text-muted-foreground">
                      {w.translation}
                      {w.partOfSpeech && ` · ${t.pos[w.partOfSpeech]}`}
                    </div>
                  </div>
                  <WordStateBadge word={w} />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{t.vocab.addedOn(formatRelativeDay(w.createdAt, t, locale).toLowerCase())}</span>
                  <span>{t.vocab.reviewOn(formatNextReview(w.nextReviewAt, t, locale).toLowerCase())}</span>
                  <span>{t.vocab.sentenceCount(counts.get(w.id) ?? 0)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <WordFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
