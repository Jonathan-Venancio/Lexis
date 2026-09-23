import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Quote, Search } from "lucide-react";
import { useAppData } from "@/hooks/useAppData";
import { countSentencesPerWord, findWordsInSentence, normalizeWord, searchSentences } from "@/lib/text";
import { PageHeader, PageLoading } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { SentenceFormDialog } from "@/components/sentences/SentenceFormDialog";
import { HighlightedSentence } from "@/components/sentences/HighlightedSentence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/sentences/")({
  head: () => ({
    meta: [
      { title: "Sentences — Lingo" },
      {
        name: "description",
        content: "Save English sentences and find every phrase that uses a word from your vocabulary.",
      },
      { property: "og:title", content: "Sentences — Lingo" },
      {
        property: "og:description",
        content: "Save English sentences and find every phrase that uses a word from your vocabulary.",
      },
    ],
  }),
  component: SentencesPage,
});

function SentencesPage() {
  const { ready, sentences, words } = useAppData();
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const counts = useMemo(() => countSentencesPerWord(sentences, words), [sentences, words]);
  const quickWords = useMemo(() => {
    return [...words]
      .map((word) => ({ word, count: counts.get(word.id) ?? 0 }))
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count || a.word.term.localeCompare(b.word.term))
      .slice(0, 8);
  }, [words, counts]);

  const list = useMemo(() => {
    return [...searchSentences(sentences, words, query)].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  }, [sentences, words, query]);

  const focus = useMemo(() => {
    const q = normalizeWord(query);
    if (!q) return undefined;
    return words.find((word) => normalizeWord(word.term) === q);
  }, [words, query]);

  if (!ready) return <PageLoading />;

  const description = focus
    ? `${list.length} ${list.length === 1 ? "sentence" : "sentences"} with “${focus.term}”`
    : query.trim()
      ? `${list.length} ${list.length === 1 ? "sentence" : "sentences"} found`
      : `${sentences.length} ${sentences.length === 1 ? "sentence" : "sentences"} in your collection`;

  return (
    <div className="fade-up">
      <PageHeader
        title="Sentences"
        description={description}
        actions={
          <Button variant="pop" onClick={() => setAddOpen(true)}>
            <Plus /> Add Sentence
          </Button>
        }
      />

      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by a word, for example apple"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 rounded-full bg-card pl-10"
          aria-label="Search sentences by word"
        />
      </div>

      {quickWords.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2" aria-label="Quick word filters">
          {quickWords.map(({ word, count }) => {
            const active = normalizeWord(query) === normalizeWord(word.term);
            return (
              <button
                key={word.id}
                type="button"
                onClick={() => setQuery(active ? "" : word.term)}
                className={cn(
                  "cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "bg-ink text-ink-foreground" : "bg-card text-foreground hover:bg-card/70",
                )}
              >
                {word.term} <span className="ml-1 opacity-50">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={Quote}
          title={query ? `No sentences match “${query.trim()}”` : "No sentences yet"}
          description={
            query
              ? "Try another word, or add a sentence that uses it."
              : "Add a sentence and Lingo will link it to the words already in your vocabulary."
          }
          action={
            <Button variant="ink" onClick={() => setAddOpen(true)}>
              <Plus /> Add Sentence
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {list.map((sentence) => {
            const linked = findWordsInSentence(sentence, words);
            return (
              <Link
                key={sentence.id}
                to="/sentences/$sentenceId"
                params={{ sentenceId: sentence.id }}
                className="surface block p-5 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="font-display text-xl font-bold leading-snug">
                  <HighlightedSentence
                    text={sentence.text}
                    {...(focus ? { highlightWordId: focus.id } : {})}
                  />
                </p>
                {sentence.translation && (
                  <p className="mt-1 text-sm text-muted-foreground">{sentence.translation}</p>
                )}
                {linked.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {linked.map((word) => (
                      <Badge key={word.id} variant="grape-soft">
                        {word.term}
                      </Badge>
                    ))}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      <SentenceFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
