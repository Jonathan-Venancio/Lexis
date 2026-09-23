import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { isToday } from "date-fns";
import { ArrowRight, Plus } from "lucide-react";
import { useAppData } from "@/hooks/useAppData";
import { messagesFor, readLocale, useI18n } from "@/i18n";
import { dueWords } from "@/lib/srs";
import { greeting } from "@/lib/format";
import { compareTranslations } from "@/lib/compare";
import { PageLoading } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { WordFormDialog } from "@/components/words/WordFormDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => {
    const copy = messagesFor(readLocale());
    return {
      meta: [
        { title: copy.meta.home },
        { name: "description", content: copy.meta.homeDescription },
        { property: "og:title", content: copy.meta.home },
        { property: "og:description", content: copy.meta.homeDescription },
      ],
    };
  },
  component: Dashboard,
});

function Dashboard() {
  const { ready, words, songs, profile } = useAppData();
  const { t } = useI18n();
  const [addOpen, setAddOpen] = useState(false);

  const stats = useMemo(() => {
    const todays = words.filter((w) => isToday(new Date(w.createdAt)));
    return {
      todays,
      total: words.length,
      learning: words.filter((w) => w.status === "learning" || w.status === "new").length,
      mastered: words.filter((w) => w.status === "mastered").length,
      due: dueWords(words).length,
    };
  }, [words]);

  if (!ready) return <PageLoading />;

  const goal = profile.dailyGoal;
  const done = stats.todays.length;
  const pct = Math.min(100, Math.round((done / goal) * 100));
  const remaining = Math.max(0, goal - done);
  const featuredSong = songs[0];
  const songStats = featuredSong
    ? compareTranslations(featuredSong.lyrics, featuredSong.myTranslation, featuredSong.referenceTranslation).stats
    : null;

  return (
    <div className="fade-up">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">{greeting(profile.name, t)}</div>
          <h1 className="font-display text-3xl font-extrabold md:text-4xl">{t.home.ready}</h1>
        </div>
        <Button variant="pop" onClick={() => setAddOpen(true)}>
          <Plus /> {t.home.addWord}
        </Button>
      </div>

      <section className="grid gap-5 lg:grid-cols-5">
        <div className="rounded-[30px] bg-ink p-8 text-ink-foreground lg:col-span-3">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-foreground/50">
            {t.home.dailyGoal}
          </div>
          <div className="mt-2 flex items-end gap-3">
            <span className="font-display text-7xl font-extrabold leading-none">{done}</span>
            <span className="mb-1 font-display text-2xl font-bold text-ink-foreground/40">
              {t.home.goalOf(goal)}
            </span>
          </div>
          <div
            className="mt-5 h-4 w-full overflow-hidden rounded-full bg-ink-foreground/15"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-4 rounded-full bg-mint transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-4 inline-block rounded-full bg-mint/20 px-4 py-1.5 text-sm font-bold text-mint">
            {remaining > 0 ? t.home.remaining(remaining) : t.home.goalReached}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          <Stat label={t.home.total} value={stats.total} />
          <Stat label={t.home.learning} value={stats.learning} tone="text-grape" />
          <Stat label={t.home.mastered} value={stats.mastered} tone="text-mint" />
          <Stat label={t.home.due} value={stats.due} tone="text-coral" />
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-3xl font-extrabold">{t.home.todayTitle}</h2>
          <Link
            to="/vocabulary"
            className="text-sm font-bold text-primary underline underline-offset-4"
          >
            {t.home.viewAll}
          </Link>
        </div>
        {stats.todays.length === 0 ? (
          <div className="surface flex flex-col items-start gap-3 p-6">
            <p className="text-muted-foreground">{t.home.noneToday}</p>
            <Button variant="ink" size="sm" onClick={() => setAddOpen(true)}>
              <Plus /> {t.home.addFirst}
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {stats.todays.map((w) => (
              <Link
                key={w.id}
                to="/vocabulary/$wordId"
                params={{ wordId: w.id }}
                className="surface flex items-center justify-between p-5 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div>
                  <div className="font-display text-xl font-extrabold">{w.term}</div>
                  <div className="text-sm text-muted-foreground">
                    {w.translation}
                    {w.partOfSpeech && ` · ${t.pos[w.partOfSpeech]}`}
                  </div>
                </div>
                <StatusBadge status={w.status} />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-5 lg:grid-cols-2">
        <div className="rounded-[26px] bg-grape p-7 text-grape-foreground">
          <div className="font-display text-2xl font-extrabold">{t.home.reviewTitle}</div>
          <p className="mt-1 text-grape-foreground/70">
            {stats.due === 0 ? t.home.nothingDue : t.home.dueCards(stats.due)}
          </p>
          <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-grape-foreground/80">
            <span className="rounded-full bg-grape-foreground/15 px-3 py-1">{t.home.streakChip(profile.streakDays)}</span>
          </div>
          <Button asChild variant="ink-pop" className="mt-5">
            <Link to="/review">
              {t.home.startReview} <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="surface p-7">
          <div className="font-display text-2xl font-extrabold">{t.home.songsTitle}</div>
          {featuredSong && songStats ? (
            <>
              <p className="mt-1 text-muted-foreground">
                {featuredSong.title} — {featuredSong.artist}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="mint-soft">{t.home.correct} {songStats.correctPct}%</Badge>
                <Badge variant="sun-soft">{t.home.close} {songStats.closePct}%</Badge>
                <Badge variant="coral-soft">{t.home.different} {songStats.differentPct}%</Badge>
              </div>
              <Button asChild variant="outline" className="mt-5">
                <Link to="/songs/$songId" params={{ songId: featuredSong.id }} search={{ tab: "compare" }}>
                  {t.home.compare} <ArrowRight />
                </Link>
              </Button>
            </>
          ) : (
            <p className="mt-1 text-muted-foreground">{t.home.addSongHint}</p>
          )}
        </div>
      </section>

      <WordFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="surface p-4">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-3xl font-extrabold ${tone ?? ""}`}>{value}</div>
    </div>
  );
}
