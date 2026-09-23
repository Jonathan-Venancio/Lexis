import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BookOpenText, Plus, Search } from "lucide-react";
import { useAppData } from "@/hooks/useAppData";
import { normalizeWord, countSentencesPerWord } from "@/lib/text";
import { formatNextReview, formatRelativeDay } from "@/lib/format";
import { PageHeader, PageLoading } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
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
import type { WordStatus } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/vocabulary/")({
  head: () => ({
    meta: [
      { title: "Vocabulary — Lingo" },
      { name: "description", content: "Browse, search and manage every word in your personal English vocabulary." },
      { property: "og:title", content: "Vocabulary — Lingo" },
      { property: "og:description", content: "Browse, search and manage every word in your personal English vocabulary." },
    ],
  }),
  component: VocabularyPage,
});

type Filter = "all" | WordStatus;
type Sort = "recent" | "oldest" | "az" | "za" | "reviewed";

const filters: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "learning", label: "Learning" },
  { value: "review", label: "Review" },
  { value: "mastered", label: "Mastered" },
];

function VocabularyPage() {
  const { ready, words, sentences } = useAppData();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("recent");
  const [addOpen, setAddOpen] = useState(false);

  const counts = useMemo(() => countSentencesPerWord(sentences, words), [sentences, words]);

  const list = useMemo(() => {
    const q = normalizeWord(query);
    let out = words.filter((w) => {
      if (filter !== "all" && w.status !== filter) return false;
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
        title="Vocabulary"
        description={`${words.length} words in your personal dictionary`}
        actions={
          <Button variant="pop" onClick={() => setAddOpen(true)}>
            <Plus /> Add Word
          </Button>
        }
      />

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search words, translations or definitions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 rounded-full bg-card pl-10"
            aria-label="Search vocabulary"
          />
        </div>
        <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
          <SelectTrigger className="h-11 w-full rounded-full bg-card md:w-48" aria-label="Sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Recently added</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="az">A–Z</SelectItem>
            <SelectItem value="za">Z–A</SelectItem>
            <SelectItem value="reviewed">Most reviewed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        {filters.map((f) => {
          const n = f.value === "all" ? words.length : words.filter((w) => w.status === f.value).length;
          return (
            <button
              key={f.value}
              role="tab"
              aria-selected={filter === f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                "cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                filter === f.value
                  ? "bg-ink text-ink-foreground"
                  : "bg-card text-foreground hover:bg-card/70",
              )}
            >
              {f.label} <span className="ml-1 opacity-50">{n}</span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={BookOpenText}
          title={query ? `No words match "${query}"` : "No words here yet"}
          description={
            query
              ? "Try a different search or clear the filters."
              : "Add a word to start building your vocabulary."
          }
          action={
            !query && (
              <Button variant="ink" onClick={() => setAddOpen(true)}>
                <Plus /> Add Word
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
                  <th className="px-5 py-3">Word</th>
                  <th className="px-5 py-3">Translation</th>
                  <th className="px-5 py-3">Part of speech</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Date added</th>
                  <th className="px-5 py-3">Next review</th>
                  <th className="px-5 py-3">Sentences</th>
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
                    <td className="px-5 py-3 text-muted-foreground">{w.partOfSpeech ?? "—"}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={w.status} />
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{formatRelativeDay(w.createdAt)}</td>
                    <td className="px-5 py-3 text-muted-foreground">{formatNextReview(w.nextReviewAt)}</td>
                    <td className="px-5 py-3 text-muted-foreground">
                      {counts.get(w.id) ?? 0} {counts.get(w.id) === 1 ? "sentence" : "sentences"}
                    </td>
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
                      {w.partOfSpeech && ` · ${w.partOfSpeech}`}
                    </div>
                  </div>
                  <StatusBadge status={w.status} />
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>Added {formatRelativeDay(w.createdAt).toLowerCase()}</span>
                  <span>Review {formatNextReview(w.nextReviewAt).toLowerCase()}</span>
                  <span>{counts.get(w.id) ?? 0} sentences</span>
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
