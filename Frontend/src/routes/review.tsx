import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PartyPopper, RotateCcw } from "lucide-react";
import { useAppData } from "@/hooks/useAppData";
import { messagesFor, readLocale, useI18n } from "@/i18n";
import { dueWords } from "@/lib/srs";
import { formatNextReview, formatPreview } from "@/lib/format";
import { PageHeader, PageLoading } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { HighlightedSentence } from "@/components/sentences/HighlightedSentence";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import type { ReviewGrade, Word } from "@/types";
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

type Phase = "idle" | "session" | "done";

const emptyResults: Record<ReviewGrade, number> = { again: 0, hard: 0, good: 0, easy: 0 };

const gradeMeta: { grade: ReviewGrade; key: string; className: string }[] = [
  { grade: "again", key: "1", className: "bg-coral text-coral-foreground" },
  { grade: "hard", key: "2", className: "bg-sun text-sun-foreground" },
  { grade: "good", key: "3", className: "bg-sky text-sky-foreground" },
  { grade: "easy", key: "4", className: "bg-mint text-mint-foreground" },
];

function ReviewPage() {
  const { ready, words, gradeWord } = useAppData();
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("idle");
  const [queue, setQueue] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState(emptyResults);

  const due = dueWords(words);
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

  return (
    <div className="fade-up">
      <PageHeader title={t.review.title} description={t.review.description} />

      {phase === "idle" && (
        <IdleState due={due} total={words.length} onStart={() => start(due)} onReviewAll={() => start(words)} />
      )}

      {phase === "session" && card && (
        <Session
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
          onAgain={() => start(dueWords(words))}
          onHome={() => setPhase("idle")}
        />
      )}
    </div>
  );
}

function IdleState({
  due,
  total,
  onStart,
  onReviewAll,
}: {
  due: Word[];
  total: number;
  onStart: () => void;
  onReviewAll: () => void;
}) {
  const { t } = useI18n();
  if (total === 0) {
    return (
      <EmptyState
        icon={RotateCcw}
        title={t.review.none}
        description={t.review.noneHint}
        action={
          <Button asChild variant="ink">
            <Link to="/vocabulary">{t.review.openVocab}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <section className="grid gap-5 lg:grid-cols-5">
      <div className="rounded-[30px] bg-grape p-8 text-grape-foreground lg:col-span-3">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-grape-foreground/60">
          {t.review.dueToday}
        </div>
        <div className="mt-2 flex items-end gap-3">
          <span className="font-display text-7xl font-extrabold leading-none">{due.length}</span>
          <span className="mb-1 font-display text-2xl font-bold text-grape-foreground/50">
            {due.length === 1 ? t.review.card : t.review.cards}
          </span>
        </div>
        <p className="mt-4 max-w-md text-grape-foreground/80">
          {due.length === 0 ? t.review.idleEmpty : t.review.idleHint}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {due.length > 0 && (
            <Button variant="ink-pop" onClick={onStart}>
              {t.review.start}
            </Button>
          )}
          <Button variant={due.length === 0 ? "ink-pop" : "outline"} onClick={onReviewAll} className={due.length === 0 ? "" : "border-grape-foreground/30 text-grape-foreground hover:bg-grape-foreground/10"}>
            {t.review.reviewAll}
          </Button>
        </div>
      </div>

      <div className="surface p-6 lg:col-span-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {due.length > 0 ? t.review.waiting : t.review.deck}
        </div>
        <ul className="mt-4 grid gap-2">
          {(due.length > 0 ? due : []).slice(0, 6).map((word) => (
            <li key={word.id} className="flex items-center justify-between gap-3">
              <span className="font-display text-lg font-extrabold">{word.term}</span>
              <StatusBadge status={word.status} />
            </li>
          ))}
          {due.length === 0 && (
            <li className="text-sm text-muted-foreground">{t.review.deckEmpty(total)}</li>
          )}
          {due.length > 6 && (
            <li className="text-sm text-muted-foreground">{t.review.more(due.length - 6)}</li>
          )}
        </ul>
      </div>
    </section>
  );
}

function Session({
  card,
  index,
  total,
  revealed,
  onReveal,
  onGrade,
}: {
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
        <span>{t.review.progress(index + 1, total)}</span>
        <span className="text-muted-foreground">{t.review.donePct(pct)}</span>
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
  onAgain,
  onHome,
}: {
  queue: Word[];
  words: Word[];
  results: Record<ReviewGrade, number>;
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

  const stillDue = dueWords(words).length;

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
