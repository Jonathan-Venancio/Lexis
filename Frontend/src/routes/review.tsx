import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Lock, PartyPopper, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/hooks/useAppData";
import { messagesFor, readLocale, useI18n } from "@/i18n";
import { wordsInDeck } from "@/lib/decks";
import { dueWords } from "@/lib/srs";
import { formatNextReview, formatPreview } from "@/lib/format";
import { PageHeader, PageLoading } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { HighlightedSentence } from "@/components/sentences/HighlightedSentence";
import { WordStateBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { CreateDeckDialog, IncludeWordsDialog } from "@/components/decks/DeckDialogs";
import { WordFormDialog } from "@/components/words/WordFormDialog";
import { Button } from "@/components/ui/button";
import { ALL_DECK_ID, type Deck, type ReviewGrade, type Word } from "@/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/review")({
  head: () => {
    const copy = messagesFor(readLocale());
    return {
      meta: [
        { title: copy.meta.review },
        { name: "description", content: copy.meta.reviewDescription },
        { property: "og:title", content: copy.meta.review },
        { property: "og:description", content: copy.meta.reviewDescription },
      ],
    };
  },
  component: ReviewPage,
});

type Phase = "decks" | "deck" | "session" | "done";

const emptyResults: Record<ReviewGrade, number> = { again: 0, hard: 0, good: 0, easy: 0 };

const gradeMeta: { grade: ReviewGrade; key: string; className: string }[] = [
  { grade: "again", key: "1", className: "bg-coral text-coral-foreground" },
  { grade: "hard", key: "2", className: "bg-sun text-sun-foreground" },
  { grade: "good", key: "3", className: "bg-sky text-sky-foreground" },
  { grade: "easy", key: "4", className: "bg-mint text-mint-foreground" },
];

function ReviewPage() {
  const {
    ready,
    words,
    decks,
    gradeWord,
    createDeck,
    deleteDeck,
    addWordsToDeck,
    removeWordFromDeck,
  } = useAppData();
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("decks");
  const [deckId, setDeckId] = useState(ALL_DECK_ID);
  const [queue, setQueue] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState(emptyResults);
  const [createOpen, setCreateOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [includeOpen, setIncludeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const custom = decks.find((deck) => deck.id === deckId);
  const isAll = deckId === ALL_DECK_ID;
  const membership = wordsInDeck(deckId, decks, words);
  const due = dueWords(membership);
  const deckName = isAll ? t.review.allDeck : (custom?.name ?? t.review.allDeck);
  const card = queue[index];

  const grade = (value: ReviewGrade) => {
    if (!card) return;
    gradeWord(card.id, value);
    setResults((current) => ({ ...current, [value]: current[value] + 1 }));
    if (index + 1 >= queue.length) {
      setPhase("done");
      return;
    }
    setIndex((current) => current + 1);
    setRevealed(false);
  };

  const gradeRef = useRef(grade);
  gradeRef.current = grade;

  useEffect(() => {
    if (phase !== "session") return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
      if ((event.key === " " || event.key === "Enter") && !revealed) {
        event.preventDefault();
        setRevealed(true);
        return;
      }
      if (!revealed) return;
      const match = gradeMeta.find((item) => item.key === event.key);
      if (!match) return;
      event.preventDefault();
      gradeRef.current(match.grade);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, revealed]);

  if (!ready) return <PageLoading />;

  const start = (source: Word[]) => {
    if (source.length === 0) return;
    setQueue(source);
    setIndex(0);
    setRevealed(false);
    setResults(emptyResults);
    setPhase("session");
  };

  const openDeck = (id: string) => {
    setDeckId(id);
    setPhase("deck");
  };

  const includeWord = async (word: Word) => {
    if (isAll) return;
    if (membership.some((item) => item.id === word.id)) {
      toast.message(t.review.alreadyHere);
      return;
    }
    await addWordsToDeck(deckId, [word.id]);
    toast.success(t.review.included(1));
  };

  const outside = isAll ? [] : words.filter((word) => !membership.some((item) => item.id === word.id));

  return (
    <div className="fade-up">
      {phase === "decks" && (
        <>
          <PageHeader
            title={t.review.title}
            description={t.review.description}
            actions={
              <Button variant="pop" onClick={() => setCreateOpen(true)}>
                <Plus /> {t.review.newDeck}
              </Button>
            }
          />
          <DeckList words={words} decks={decks} onOpen={openDeck} />
        </>
      )}

      {phase === "deck" && (isAll || custom) && (
        <DeckDetail
          name={deckName}
          builtIn={isAll}
          words={membership}
          due={due}
          onBack={() => setPhase("decks")}
          onStudyDue={() => start(due)}
          onStudyAll={() => start(membership)}
          onAdd={() => setAddOpen(true)}
          {...(isAll
            ? {}
            : {
                onInclude: () => setIncludeOpen(true),
                onRemove: async (word: Word) => {
                  await removeWordFromDeck(deckId, word.id);
                  toast.success(t.review.removed(word.term));
                },
                onDelete: () => setDeleteOpen(true),
              })}
        />
      )}

      {phase === "session" && card && (
        <Session
          deckName={deckName}
          card={card}
          index={index}
          total={queue.length}
          revealed={revealed}
          onReveal={() => setRevealed(true)}
          onGrade={grade}
        />
      )}

      {phase === "done" && (
        <DoneState
          queue={queue}
          words={words}
          results={results}
          stillDue={dueWords(membership).length}
          onAgain={() => start(dueWords(wordsInDeck(deckId, decks, words)))}
          onHome={() => setPhase("deck")}
        />
      )}

      <CreateDeckDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        words={words}
        onCreate={async (name, wordIds) => {
          try {
            const deck = await createDeck(name, wordIds);
            toast.success(t.review.created(deck.name));
            openDeck(deck.id);
          } catch {
            toast.error(t.common.failed);
            throw new Error("deck");
          }
        }}
      />
      <WordFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        {...(isAll ? {} : { deckId, onIncludeExisting: includeWord })}
      />
      <IncludeWordsDialog
        open={includeOpen}
        onOpenChange={setIncludeOpen}
        words={outside}
        onInclude={async (ids) => {
          await addWordsToDeck(deckId, ids);
          toast.success(t.review.included(ids.length));
        }}
      />
      {custom && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title={t.review.deleteDeckTitle(custom.name)}
          description={t.review.deleteDeckHint}
          confirmLabel={t.review.deleteDeck}
          destructive
          onConfirm={() => {
            void deleteDeck(custom.id).then(() => {
              toast.success(t.review.deleted(custom.name));
              setPhase("decks");
            });
          }}
        />
      )}
    </div>
  );
}

function DeckList({
  words,
  decks,
  onOpen,
}: {
  words: Word[];
  decks: Deck[];
  onOpen: (id: string) => void;
}) {
  const { t } = useI18n();
  const allDue = dueWords(words).length;

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <DeckCard
        name={t.review.allDeck}
        hint={t.review.allDeckHint}
        count={words.length}
        due={allDue}
        locked
        onOpen={() => onOpen(ALL_DECK_ID)}
      />
      {decks.map((deck) => {
        const members = wordsInDeck(deck.id, decks, words);
        return (
          <DeckCard
            key={deck.id}
            name={deck.name}
            count={members.length}
            due={dueWords(members).length}
            onOpen={() => onOpen(deck.id)}
          />
        );
      })}
    </section>
  );
}

function DeckCard({
  name,
  hint,
  count,
  due,
  locked,
  onOpen,
}: {
  name: string;
  hint?: string;
  count: number;
  due: number;
  locked?: boolean;
  onOpen: () => void;
}) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex cursor-pointer flex-col rounded-[30px] p-6 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        locked ? "bg-grape text-grape-foreground" : "surface",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "text-xs font-semibold uppercase tracking-[0.16em]",
            locked ? "text-grape-foreground/60" : "text-muted-foreground",
          )}
        >
          {locked ? t.review.locked : t.review.deck}
        </span>
        {locked && <Lock className="size-4 opacity-70" />}
      </div>
      <h2 className="mt-3 font-display text-2xl font-extrabold">{name}</h2>
      {hint && (
        <p className={cn("mt-2 text-sm", locked ? "text-grape-foreground/75" : "text-muted-foreground")}>{hint}</p>
      )}
      <div className="mt-5 flex flex-wrap gap-2 text-sm font-semibold">
        <span className={cn("rounded-full px-3 py-1", locked ? "bg-grape-foreground/10" : "bg-background")}>
          {t.review.wordCount(count)}
        </span>
        <span className={cn("rounded-full px-3 py-1", locked ? "bg-grape-foreground/10" : "bg-background")}>
          {due === 0 ? t.review.noneDue : t.review.dueCount(due)}
        </span>
      </div>
    </button>
  );
}

function DeckDetail({
  name,
  builtIn,
  words,
  due,
  onBack,
  onStudyDue,
  onStudyAll,
  onAdd,
  onInclude,
  onRemove,
  onDelete,
}: {
  name: string;
  builtIn: boolean;
  words: Word[];
  due: Word[];
  onBack: () => void;
  onStudyDue: () => void;
  onStudyAll: () => void;
  onAdd: () => void;
  onInclude?: () => void;
  onRemove?: (word: Word) => void;
  onDelete?: () => void;
}) {
  const { t } = useI18n();
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" /> {t.review.backToDecks}
      </button>
      <PageHeader
        title={name}
        description={builtIn ? t.review.allDeckHint : t.review.wordCount(words.length)}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="pop" onClick={onAdd}>
              <Plus /> {t.review.addWord}
            </Button>
            {onInclude && (
              <Button variant="outline" onClick={onInclude}>
                {t.review.include}
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" onClick={onDelete}>
                <Trash2 /> {t.review.deleteDeck}
              </Button>
            )}
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {due.length > 0 && (
          <Button variant="ink" onClick={onStudyDue}>
            {t.review.studyDue}
          </Button>
        )}
        <Button variant={due.length > 0 ? "outline" : "ink"} onClick={onStudyAll} disabled={words.length === 0}>
          {t.review.studyAll}
        </Button>
      </div>

      {words.length === 0 ? (
        <EmptyState icon={Plus} title={t.review.emptyDeck} description={t.review.emptyDeckHint} />
      ) : (
        <ul className="grid gap-2">
          {words.map((word) => (
            <li key={word.id} className="surface flex items-center gap-3 px-4 py-3">
              <Link
                to="/vocabulary/$wordId"
                params={{ wordId: word.id }}
                className="min-w-0 flex-1 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="font-display text-lg font-extrabold">{word.term}</div>
                <div className="truncate text-sm text-muted-foreground">{word.translation}</div>
              </Link>
              <WordStateBadge word={word} />
              {onRemove && (
                <Button variant="ghost" size="sm" onClick={() => onRemove(word)}>
                  {t.review.remove}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Session({
  deckName,
  card,
  index,
  total,
  revealed,
  onReveal,
  onGrade,
}: {
  deckName: string;
  card: Word;
  index: number;
  total: number;
  revealed: boolean;
  onReveal: () => void;
  onGrade: (grade: ReviewGrade) => void;
}) {
  const { t } = useI18n();
  const pct = Math.round((index / total) * 100);

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between gap-4 text-sm font-semibold">
        <span>{deckName}</span>
        <span>
          {t.review.progress(index + 1, total)}
          <span className="ml-3 text-muted-foreground">{t.review.donePct(pct)}</span>
        </span>
      </div>
      <div
        className="mb-5 h-3 w-full overflow-hidden rounded-full bg-card"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="h-3 rounded-full bg-grape transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>

      <article key={`${card.id}-${revealed ? "back" : "front"}`} className="flip-in surface-lg p-8 md:p-12">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {card.partOfSpeech ? t.pos[card.partOfSpeech] : t.review.wordFallback}
        </div>
        <h2 className="mt-3 font-display text-5xl font-extrabold uppercase tracking-tight md:text-7xl">
          {card.term}
        </h2>

        {revealed ? (
          <div className="mt-8 grid gap-5 border-t border-border pt-6">
            <div className="font-display text-2xl font-bold text-primary">{card.translation}</div>
            <p className="text-lg">{card.definition || t.review.noDefinition}</p>
            {card.example && (
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">{t.review.example} </span>
                <HighlightedSentence text={card.example} highlightWordId={card.id} />
              </p>
            )}
          </div>
        ) : (
          <p className="mt-6 text-muted-foreground">{t.review.recall}</p>
        )}
      </article>

      {!revealed ? (
        <div className="mt-5">
          <Button variant="pop" size="lg" className="w-full" onClick={onReveal}>
            {t.review.show}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">{t.review.space}</p>
        </div>
      ) : (
        <div className="mt-5">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {gradeMeta.map((item) => (
              <button
                key={item.grade}
                type="button"
                onClick={() => onGrade(item.grade)}
                className={cn(
                  "cursor-pointer rounded-2xl px-3 py-4 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  item.className,
                )}
              >
                <div className="text-xs font-semibold uppercase tracking-wide opacity-70">{t.review[item.grade]}</div>
                <div className="mt-1 font-display text-xl font-extrabold">
                  {formatPreview(card, item.grade, t)}
                </div>
                <div className="mt-2 text-[11px] font-bold opacity-60">{t.review.key(item.key)}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DoneState({
  queue,
  words,
  results,
  stillDue,
  onAgain,
  onHome,
}: {
  queue: Word[];
  words: Word[];
  results: Record<ReviewGrade, number>;
  stillDue: number;
  onAgain: () => void;
  onHome: () => void;
}) {
  const { t, locale } = useI18n();
  const reviewed = results.again + results.hard + results.good + results.easy;
  const upcoming = queue
    .map((card) => words.find((word) => word.id === card.id)?.nextReviewAt)
    .filter((iso): iso is string => Boolean(iso))
    .map((iso) => new Date(iso).getTime())
    .filter((time) => time > Date.now())
    .sort((a, b) => a - b)[0];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-[30px] bg-ink p-8 text-ink-foreground md:p-10">
        <PartyPopper className="size-8 text-mint" />
        <h2 className="mt-4 font-display text-4xl font-extrabold">{t.review.complete}</h2>
        <p className="mt-2 text-ink-foreground/70">
          {t.review.reviewed(reviewed)}
          {upcoming ? t.review.next(formatNextReview(new Date(upcoming).toISOString(), t, locale).toLowerCase()) : ""}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Summary label={t.review.again} value={results.again} />
          <Summary label={t.review.hard} value={results.hard} />
          <Summary label={t.review.good} value={results.good} />
          <Summary label={t.review.easy} value={results.easy} />
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          {stillDue > 0 && (
            <Button variant="ink-pop" onClick={onAgain}>
              {t.review.stillDue(stillDue)}
            </Button>
          )}
          <Button variant="outline" onClick={onHome} className="border-ink-foreground/30 text-ink-foreground hover:bg-ink-foreground/10">
            {t.common.back}
          </Button>
          <Button asChild variant="ghost" className="text-ink-foreground hover:bg-ink-foreground/10">
            <Link to="/">{t.common.home}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-ink-foreground/10 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-foreground/50">{label}</div>
      <div className="mt-1 font-display text-3xl font-extrabold">{value}</div>
    </div>
  );
}
