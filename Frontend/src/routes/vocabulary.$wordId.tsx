import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Pencil, Plus, Quote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/hooks/useAppData";
import { findSentencesForWord } from "@/lib/text";
import { successRate } from "@/lib/srs";
import { formatLongDate, formatNextReview, statusLabel } from "@/lib/format";
import { PageLoading } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { WordFormDialog } from "@/components/words/WordFormDialog";
import { SentenceFormDialog } from "@/components/sentences/SentenceFormDialog";
import { HighlightedSentence } from "@/components/sentences/HighlightedSentence";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/vocabulary/$wordId")({
  head: () => ({
    meta: [
      { title: "Word details — Lingo" },
      { name: "description", content: "Definition, examples, review stats and every sentence using this word." },
      { property: "og:title", content: "Word details — Lingo" },
      { property: "og:description", content: "Definition, examples, review stats and every sentence using this word." },
    ],
  }),
  component: WordDetailPage,
});

function WordDetailPage() {
  const { wordId } = Route.useParams();
  const { ready, words, sentences, deleteWord } = useAppData();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [addSentenceOpen, setAddSentenceOpen] = useState(false);

  const word = words.find((w) => w.id === wordId);
  const related = useMemo(
    () => (word ? findSentencesForWord(sentences, word) : []),
    [sentences, word],
  );

  if (!ready) return <PageLoading />;

  if (!word) {
    return (
      <EmptyState
        icon={Quote}
        title="Word not found"
        description="It may have been deleted."
        action={
          <Button asChild variant="ink">
            <Link to="/vocabulary">Back to vocabulary</Link>
          </Button>
        }
      />
    );
  }

  const onDelete = () => {
    deleteWord(word.id);
    toast.success(`"${word.term}" deleted`);
    navigate({ to: "/vocabulary" });
  };

  return (
    <div className="fade-up mx-auto max-w-4xl">
      <Link
        to="/vocabulary"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Vocabulary
      </Link>

      <div className="surface-lg p-7 md:p-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-5xl font-extrabold uppercase tracking-tight md:text-6xl">
                {word.term}
              </h1>
              <StatusBadge status={word.status} />
            </div>
            <div className="mt-2 text-sm italic text-muted-foreground">{word.partOfSpeech ?? "—"}</div>
            <div className="mt-3 font-display text-2xl font-bold text-primary">{word.translation}</div>
          </div>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Edit word" onClick={() => setEditOpen(true)}>
                  <Pencil />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Delete word" onClick={() => setDeleteOpen(true)}>
                  <Trash2 />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Definition</div>
            <p className="mt-1 text-lg">{word.definition || <span className="text-muted-foreground">No definition yet.</span>}</p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Example</div>
            <p className="mt-1 text-lg">
              {word.example ? (
                <HighlightedSentence text={word.example} highlightWordId={word.id} />
              ) : (
                <span className="text-muted-foreground">No example yet.</span>
              )}
            </p>
          </div>
          {word.notes && (
            <div className="md:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</div>
              <p className="mt-1 text-muted-foreground">{word.notes}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Meta label="Added" value={formatLongDate(word.createdAt)} />
        <Meta label="Reviews" value={String(word.reviewCount)} />
        <Meta label="Success rate" value={word.reviewCount ? `${successRate(word)}%` : "—"} />
        <Meta label="Status" value={statusLabel(word.status)} />
        <Meta label="Next review" value={formatNextReview(word.nextReviewAt)} />
      </div>

      <section className="mt-10">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-3xl font-extrabold">
              Sentences with “{word.term}”
            </h2>
            <p className="text-sm text-muted-foreground">
              {related.length} {related.length === 1 ? "sentence" : "sentences"} found
            </p>
          </div>
          <Button variant="ink" size="sm" onClick={() => setAddSentenceOpen(true)}>
            <Plus /> Add sentence
          </Button>
        </div>

        {related.length === 0 ? (
          <EmptyState
            compact
            icon={Quote}
            title="No sentences with this word yet."
            description={`Add a sentence using "${word.term}" to see it here.`}
            action={
              <Button variant="ink" size="sm" onClick={() => setAddSentenceOpen(true)}>
                <Plus /> Add sentence
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3">
            {related.map((s) => (
              <Link
                key={s.id}
                to="/sentences/$sentenceId"
                params={{ sentenceId: s.id }}
                className="surface block p-5 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <p className="font-display text-xl font-bold">
                  <HighlightedSentence text={s.text} highlightWordId={word.id} />
                </p>
                {s.translation && <p className="mt-1 text-sm text-muted-foreground">{s.translation}</p>}
              </Link>
            ))}
          </div>
        )}
      </section>

      <WordFormDialog open={editOpen} onOpenChange={setEditOpen} word={word} />
      <SentenceFormDialog open={addSentenceOpen} onOpenChange={setAddSentenceOpen} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete "${word.term}"?`}
        description="This removes the word and its review history. Sentences are kept."
        confirmLabel="Delete"
        destructive
        onConfirm={onDelete}
      />
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface p-4">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-lg font-extrabold">{value}</div>
    </div>
  );
}
