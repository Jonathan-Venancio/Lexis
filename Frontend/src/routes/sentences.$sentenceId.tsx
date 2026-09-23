import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Pencil, Quote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/hooks/useAppData";
import { messagesFor, readLocale, useI18n } from "@/i18n";
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
  head: () => {
    const copy = messagesFor(readLocale());
    return {
      meta: [
        { title: copy.meta.sentence },
        { name: "description", content: copy.meta.sentenceDescription },
        { property: "og:title", content: copy.meta.sentence },
        { property: "og:description", content: copy.meta.sentenceDescription },
      ],
    };
  },
  component: SentenceDetailPage,
});

function SentenceDetailPage() {
  const { sentenceId } = Route.useParams();
  const { ready, sentences, words, deleteSentence } = useAppData();
  const { t, locale } = useI18n();
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
        title={t.sentence.notFound}
        description={t.sentence.notFoundHint}
        action={
          <Button asChild variant="ink">
            <Link to="/sentences">{t.sentence.backToList}</Link>
          </Button>
        }
      />
    );
  }

  const onDelete = () => {
    deleteSentence(sentence.id);
    toast.success(t.sentence.deleted);
    navigate({ to: "/sentences" });
  };

  return (
    <div className="fade-up mx-auto max-w-4xl">
      <Link
        to="/sentences"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {t.sentence.back}
      </Link>

      <div className="surface-lg p-7 md:p-9">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.sentence.english}
            </div>
            <h1 className="mt-2 font-display text-3xl font-extrabold leading-snug md:text-4xl">
              <HighlightedSentence text={sentence.text} interactive />
            </h1>
          </div>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" aria-label={t.sentence.editLabel} onClick={() => setEditOpen(true)}>
                  <Pencil />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t.common.edit}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t.sentence.deleteLabel}
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{t.common.delete}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.sentence.translation}
            </div>
            <p className="mt-1 text-lg">
              {sentence.translation || <span className="text-muted-foreground">{t.sentence.noTranslation}</span>}
            </p>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.sentence.added}</div>
            <p className="mt-1 text-lg">{formatLongDate(sentence.createdAt, t, locale)}</p>
          </div>
          {sentence.notes && (
            <div className="md:col-span-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.sentence.notes}</div>
              <p className="mt-1 text-muted-foreground">{sentence.notes}</p>
            </div>
          )}
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-display text-3xl font-extrabold">{t.sentence.wordsTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {linked.length === 0 ? t.sentence.noneYet : t.sentence.linked(linked.length)}
        </p>
        {linked.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              compact
              icon={Quote}
              title={t.sentence.noLinked}
              description={t.sentence.noLinkedHint}
              action={
                <Button asChild variant="ink" size="sm">
                  <Link to="/vocabulary">{t.sentence.openVocab}</Link>
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
        title={t.sentence.deleteTitle}
        description={t.sentence.deleteHint}
        confirmLabel={t.common.delete}
        destructive
        onConfirm={onDelete}
      />
    </div>
  );
}
