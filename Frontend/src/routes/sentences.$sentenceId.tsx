import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Pencil, Quote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/hooks/useAppData";
import { findWordsInSentence } from "@/lib/text";
import { formatLongDate } from "@/lib/format";
import { PageLoading } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SentenceFormDialog } from "@/components/sentences/SentenceFormDialog";
import { HighlightedSentence } from "@/components/sentences/HighlightedSentence";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export const Route = createFileRoute("/sentences/$sentenceId")({
  head: () => ({
    meta: [
      { title: "Sentence — Lingo" },
      { name: "description", content: "Read a sentence and open every vocabulary word it uses." },
      { property: "og:title", content: "Sentence — Lingo" },
      { property: "og:description", content: "Read a sentence and open every vocabulary word it uses." },
    ],
  }),
  component: SentenceDetailPage,
});

function SentenceDetailPage() {
  const { sentenceId } = Route.useParams();
  const { ready, sentences, words, deleteSentence } = useAppData();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const sentence = sentences.find((item) => item.id === sentenceId);
  const linked = sentence ? findWordsInSentence(sentence, words) : [];

  if (!ready) return <PageLoading />;

  if (!sentence) {
    return (
      <EmptyState
        icon={Quote}
        title="Sentence not found"
        description="It may have been deleted."
        action={
          <Button asChild variant="ink">
            <Link to="/sentences">Back to sentences</Link>
          </Button>
        }
      />
    );
  }

  const onDelete = () => {
    deleteSentence(sentence.id);
    toast.success("Sentence deleted");
    navigate({ to: "/sentences" });
  };

  return (
    <div className="fade-up mx-auto max-w-4xl">
      <Link
        to="/sentences"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Sentences
      </Link>

      <div className="surface-lg p-7 md:p-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              English
            </div>
            <h1 className="mt-2 font-display text-3xl font-extrabold leading-snug md:text-4xl">
              <HighlightedSentence text={sentence.text} interactive />
            </h1>
          </div>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Edit sentence" onClick={() => setEditOpen(true)}>
                  <Pencil />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Delete sentence"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Translation
            </div>
            <p className="mt-1 text-lg">
              {sentence.translation || <span className="text-muted-foreground">No translation yet.</span>}
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Added</div>
            <p className="mt-1 text-lg">{formatLongDate(sentence.createdAt)}</p>
          </div>
          {sentence.notes && (
            <div className="md:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</div>
              <p className="mt-1 text-muted-foreground">{sentence.notes}</p>
            </div>
          )}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-3xl font-extrabold">Words in this sentence</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {linked.length === 0
            ? "None of your vocabulary words appear here yet."
            : `${linked.length} ${linked.length === 1 ? "word" : "words"} from your vocabulary`}
        </p>
        {linked.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              compact
              icon={Quote}
              title="No linked words"
              description="Add these words to your vocabulary and they will show up here automatically."
              action={
                <Button asChild variant="ink" size="sm">
                  <Link to="/vocabulary">Open vocabulary</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {linked.map((word) => (
              <Link
                key={word.id}
                to="/vocabulary/$wordId"
                params={{ wordId: word.id }}
                className="surface flex items-center justify-between p-5 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div>
                  <div className="font-display text-xl font-extrabold">{word.term}</div>
                  <div className="text-sm text-muted-foreground">{word.translation}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <SentenceFormDialog open={editOpen} onOpenChange={setEditOpen} sentence={sentence} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this sentence?"
        description="The words in your vocabulary stay. Only this sentence is removed."
        confirmLabel="Delete"
        destructive
        onConfirm={onDelete}
      />
    </div>
  );
}
