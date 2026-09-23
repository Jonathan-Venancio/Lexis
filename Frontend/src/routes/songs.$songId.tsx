import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Music2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/hooks/useAppData";
import { compareTranslations, splitLines } from "@/lib/compare";
import type { LineMatch } from "@/types";
import { PageLoading } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { SongFormDialog } from "@/components/songs/SongFormDialog";
import { HighlightedSentence } from "@/components/sentences/HighlightedSentence";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SongTab = "lyrics" | "translation" | "compare";

export const Route = createFileRoute("/songs/$songId")({
  validateSearch: (search: Record<string, unknown>): { tab: SongTab } => {
    const tab = search["tab"];
    if (tab === "lyrics" || tab === "translation" || tab === "compare") return { tab };
    return { tab: "lyrics" };
  },
  head: () => ({
    meta: [
      { title: "Song — Lingo" },
      { name: "description", content: "Read the lyrics, write your translation and compare it line by line." },
      { property: "og:title", content: "Song — Lingo" },
      { property: "og:description", content: "Read the lyrics, write your translation and compare it line by line." },
    ],
  }),
  component: SongDetailPage,
});

const tabs: { id: SongTab; label: string }[] = [
  { id: "lyrics", label: "Lyrics" },
  { id: "translation", label: "My translation" },
  { id: "compare", label: "Compare" },
];

const matchLabel: Record<LineMatch, string> = {
  correct: "Correct",
  close: "Close",
  different: "Different",
  missing: "Missing",
};

const matchVariant = {
  correct: "mint-soft",
  close: "sun-soft",
  different: "coral-soft",
  missing: "muted",
} as const;

function SongDetailPage() {
  const { songId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = useNavigate();
  const { ready, songs, updateSong, deleteSong } = useAppData();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [draftStamp, setDraftStamp] = useState("");

  const song = songs.find((item) => item.id === songId);
  const savedStamp = song ? `${song.id}:${song.updatedAt}` : "";
  if (savedStamp !== draftStamp) {
    setDraftStamp(savedStamp);
    setDraft(song?.myTranslation ?? "");
  }

  if (!ready) return <PageLoading />;

  if (!song) {
    return (
      <EmptyState
        icon={Music2}
        title="Song not found"
        description="It may have been deleted."
        action={
          <Button asChild variant="ink">
            <Link to="/songs">Back to songs</Link>
          </Button>
        }
      />
    );
  }

  const comparison = compareTranslations(song.lyrics, song.myTranslation, song.referenceTranslation);
  const safeUrl = song.url && /^https?:\/\//i.test(song.url) ? song.url : undefined;

  const setTab = (next: SongTab) => {
    navigate({
      to: "/songs/$songId",
      params: { songId: song.id },
      search: { tab: next },
      replace: true,
    });
  };

  const onDelete = () => {
    deleteSong(song.id);
    toast.success(`“${song.title}” deleted`);
    navigate({ to: "/songs" });
  };

  return (
    <div className="fade-up mx-auto max-w-5xl">
      <Link
        to="/songs"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Songs
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-extrabold md:text-5xl">{song.title}</h1>
          <p className="mt-1 text-muted-foreground">
            {song.artist}
            {song.album ? ` · ${song.album}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          {safeUrl && (
            <Button asChild variant="outline">
              <a href={safeUrl} target="_blank" rel="noreferrer">
                Open link <ExternalLink />
              </a>
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Edit song" onClick={() => setEditOpen(true)}>
                <Pencil />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Delete song" onClick={() => setDeleteOpen(true)}>
                <Trash2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Song sections">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab === item.id ? "bg-ink text-ink-foreground" : "bg-card text-foreground hover:bg-card/70",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "lyrics" && <LyricsPanel lyrics={song.lyrics} />}
        {tab === "translation" && (
          <TranslationPanel
            value={draft}
            saved={song.myTranslation}
            onChange={setDraft}
            onSave={() => {
              updateSong(song.id, { myTranslation: draft });
              toast.success("Translation saved");
            }}
          />
        )}
        {tab === "compare" && <ComparePanel stats={comparison.stats} lines={comparison.lines} />}
      </div>

      <SongFormDialog open={editOpen} onOpenChange={setEditOpen} song={song} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete “${song.title}”?`}
        description="This removes the lyrics and both translations."
        confirmLabel="Delete"
        destructive
        onConfirm={onDelete}
      />
    </div>
  );
}

function LyricsPanel({ lyrics }: { lyrics: string }) {
  const lines = splitLines(lyrics).filter((line) => line.trim().length > 0);
  return (
    <div className="surface-lg p-6 md:p-8">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Lyrics in English
      </div>
      <ol className="mt-4 grid gap-3">
        {lines.map((line, index) => (
          <li key={`${index}-${line}`} className="flex gap-4">
            <span className="w-6 shrink-0 pt-1 text-xs font-bold text-muted-foreground">{index + 1}</span>
            <p className="font-display text-xl font-bold leading-snug">
              <HighlightedSentence text={line} interactive />
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TranslationPanel({
  value,
  saved,
  onChange,
  onSave,
}: {
  value: string;
  saved: string;
  onChange: (next: string) => void;
  onSave: () => void;
}) {
  const dirty = value !== saved;

  return (
    <div className="surface-lg p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            My translation
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep one line per lyric line, so the comparison stays aligned.
          </p>
        </div>
        <Button variant="pop" disabled={!dirty} onClick={onSave}>
          {dirty ? "Save translation" : "Saved"}
        </Button>
      </div>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={14}
        className="mt-4 rounded-2xl bg-background font-mono text-sm"
        placeholder={"Write your translation here\none line for each lyric line"}
        aria-label="My translation"
      />
    </div>
  );
}

function ComparePanel({
  stats,
  lines,
}: {
  stats: ReturnType<typeof compareTranslations>["stats"];
  lines: ReturnType<typeof compareTranslations>["lines"];
}) {
  const visible = useMemo(() => lines.filter((line) => line.original.trim().length > 0), [lines]);

  return (
    <div className="grid gap-4">
      <section className="rounded-[30px] bg-ink p-7 text-ink-foreground">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-foreground/50">
          Translation comparison
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Correct" value={`${stats.correctPct}%`} detail={`${stats.correct} lines`} />
          <Stat label="Close" value={`${stats.closePct}%`} detail={`${stats.close} lines`} />
          <Stat label="Different" value={`${stats.differentPct}%`} detail={`${stats.different + stats.missing} lines`} />
          <Stat label="Lines" value={String(stats.total)} detail="scored" />
        </div>
      </section>

      {visible.map((line) => (
        <article key={line.index} className="surface p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-muted-foreground">Line {line.index + 1}</span>
            <Badge variant={matchVariant[line.match]}>{matchLabel[line.match]}</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Column label="Original" text={line.original} />
            <Column label="My translation" text={line.mine} empty="You have not translated this line yet." />
            <Column label="Official translation" text={line.reference} empty="No official translation for this line." />
          </div>
        </article>
      ))}
    </div>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-foreground/50">{label}</div>
      <div className="mt-1 font-display text-3xl font-extrabold">{value}</div>
      <div className="text-xs text-ink-foreground/50">{detail}</div>
    </div>
  );
}

function Column({ label, text, empty }: { label: string; text: string; empty?: string }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <p className={cn("mt-1 text-base leading-relaxed", !text.trim() && "text-sm text-muted-foreground")}>
        {text.trim() ? text : (empty ?? "—")}
      </p>
    </div>
  );
}
