import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { isToday } from "date-fns";
import { ArrowRight, Plus } from "lucide-react";
import { useAppData } from "@/hooks/useAppData";
import { dueWords } from "@/lib/srs";
import { greeting } from "@/lib/format";
import { compareTranslations } from "@/lib/compare";
import { PageLoading } from "@/components/layout/AppShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { WordFormDialog } from "@/components/words/WordFormDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lingo — Your daily English vocabulary" },
      { name: "description", content: "Track your daily goal, streak and words learned in Lingo." },
      { property: "og:title", content: "Lingo — Your daily English vocabulary" },
      { property: "og:description", content: "Track your daily goal, streak and words learned in Lingo." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { ready, words, songs, profile } = useAppData();
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
          <div className="text-sm text-muted-foreground">{greeting(profile.name)}</div>
          <h1 className="font-display text-3xl font-extrabold md:text-4xl">
            Ready to learn some English?
          </h1>
        </div>
        <Button variant="pop" onClick={() => setAddOpen(true)}>
          <Plus /> Add Word
        </Button>
      </div>

      <section className="grid gap-5 lg:grid-cols-5">
        <div className="rounded-[30px] bg-ink p-8 text-ink-foreground lg:col-span-3">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-foreground/50">
            Daily goal
          </div>
          <div className="mt-2 flex items-end gap-3">
            <span className="font-display text-7xl font-extrabold leading-none">{done}</span>
            <span className="mb-1 font-display text-2xl font-bold text-ink-foreground/40">
              / {goal} words
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
            {remaining > 0
              ? `${remaining} more ${remaining === 1 ? "word" : "words"} to reach today's goal.`
              : "Goal reached — great work today!"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:col-span-2">
          <Stat label="Total words" value={stats.total} />
          <Stat label="Learning" value={stats.learning} tone="text-grape" />
          <Stat label="Mastered" value={stats.mastered} tone="text-mint" />
          <Stat label="Due for review" value={stats.due} tone="text-coral" />
        </div>
      </section>

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-display text-3xl font-extrabold">Today's words</h2>
          <Link
            to="/vocabulary"
            className="text-sm font-bold text-primary underline underline-offset-4"
          >
            View all →
          </Link>
        </div>
        {stats.todays.length === 0 ? (
          <div className="surface flex flex-col items-start gap-3 p-6">
            <p className="text-muted-foreground">No words added today yet.</p>
            <Button variant="ink" size="sm" onClick={() => setAddOpen(true)}>
              <Plus /> Add your first word today
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
                    {w.partOfSpeech && ` · ${w.partOfSpeech}`}
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
          <div className="font-display text-2xl font-extrabold">Review session</div>
          <p className="mt-1 text-grape-foreground/70">
            {stats.due === 0
              ? "Nothing due right now. Nice!"
              : `${stats.due} ${stats.due === 1 ? "card is" : "cards are"} waiting for you.`}
          </p>
          <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-grape-foreground/80">
            <span className="rounded-full bg-grape-foreground/15 px-3 py-1">{profile.streakDays}-day streak</span>
          </div>
          <Button asChild variant="ink-pop" className="mt-5">
            <Link to="/review">
              Start review <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="surface p-7">
          <div className="font-display text-2xl font-extrabold">Songs</div>
          {featuredSong && songStats ? (
            <>
              <p className="mt-1 text-muted-foreground">
                {featuredSong.title} — {featuredSong.artist}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Badge variant="mint-soft">Correct {songStats.correctPct}%</Badge>
                <Badge variant="sun-soft">Close {songStats.closePct}%</Badge>
                <Badge variant="coral-soft">Different {songStats.differentPct}%</Badge>
              </div>
              <Button asChild variant="outline" className="mt-5">
                <Link to="/songs/$songId" params={{ songId: featuredSong.id }} search={{ tab: "compare" }}>
                  Compare translation <ArrowRight />
                </Link>
              </Button>
            </>
          ) : (
            <p className="mt-1 text-muted-foreground">Add a song to start translating.</p>
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
