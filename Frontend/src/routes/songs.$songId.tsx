import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Music2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppData } from "@/hooks/useAppData";
import { messagesFor, readLocale, useI18n } from "@/i18n";
import { compareTranslations, splitLines } from "@/lib/compare";
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
  head: () => {
    const copy = messagesFor(readLocale());
    return {
      meta: [
        { title: copy.meta.song },
        { name: "description", content: copy.meta.songDescription },
        { property: "og:title", content: copy.meta.song },
        { property: "og:description", content: copy.meta.songDescription },
      ],
    };
  },
  component: SongDetailPage,
});

const tabIds: SongTab[] = ["lyrics", "translation", "compare"];

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
  const { t } = useI18n();
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
        title={t.song.notFound}
        description={t.song.notFoundHint}
        action={
          <Button asChild variant="ink">
            <Link to="/songs">{t.song.backToList}</Link>
          </Button>
        }
      />
    );
  }

  const tabLabel: Record<SongTab, string> = {
    lyrics: t.song.lyrics,
    translation: t.song.mine,
    compare: t.song.compare,
  };
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
    void deleteSong(song.id).then(() => {
      toast.success(t.song.deleted(song.title));
      navigate({ to: "/songs" });
    });
  };

  return (
    <div className="fade-up mx-auto max-w-5xl">
      <Link
        to="/songs"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {t.song.back}
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
                {t.song.openLink} <ExternalLink />
              </a>
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" aria-label={t.song.editLabel} onClick={() => setEditOpen(true)}>
                <Pencil />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.common.edit}</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" aria-label={t.song.deleteLabel} onClick={() => setDeleteOpen(true)}>
                <Trash2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t.common.delete}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label={t.song.sections}>
        {tabIds.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cn(
              "cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tab === id ? "bg-ink text-ink-foreground" : "bg-card text-foreground hover:bg-card/70",
            )}
          >
            {tabLabel[id]}
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
              void updateSong(song.id, { myTranslation: draft }).then(() => toast.success(t.song.savedToast));
            }}
          />
        )}
        {tab === "compare" && <ComparePanel stats={comparison.stats} lines={comparison.lines} />}
      </div>

      <SongFormDialog open={editOpen} onOpenChange={setEditOpen} song={song} />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t.song.deleteTitle(song.title)}
        description={t.song.deleteHint}
        confirmLabel={t.common.delete}
        destructive
        onConfirm={onDelete}
      />
    </div>
  );
}

function LyricsPanel({ lyrics }: { lyrics: string }) {
  const { t } = useI18n();
  const lines = splitLines(lyrics).filter((line) => line.trim().length > 0);
  return (
    <div className="surface-lg p-6 md:p-8">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t.song.lyricsTitle}
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
  const { t } = useI18n();
  const dirty = value !== saved;

  return (
    <div className="surface-lg p-6 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t.song.mineTitle}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t.song.mineHint}</p>
        </div>
        <Button variant="pop" disabled={!dirty} onClick={onSave}>
          {dirty ? t.song.save : t.song.saved}
        </Button>
      </div>
      <Textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={14}
        className="mt-4 rounded-2xl bg-background font-mono text-sm"
        placeholder={t.song.placeholder}
        aria-label={t.song.mineTitle}
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
  const { t } = useI18n();
  const visible = useMemo(() => lines.filter((line) => line.original.trim().length > 0), [lines]);

  return (
    <div className="grid gap-4">
      <section className="rounded-[30px] bg-ink p-7 text-ink-foreground">
        <div className="text-sm font-semibold uppercase tracking-[0.2em] text-ink-foreground/50">
          {t.song.comparison}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label={t.song.correct} value={`${stats.correctPct}%`} detail={t.song.lineCount(stats.correct)} />
          <Stat label={t.song.close} value={`${stats.closePct}%`} detail={t.song.lineCount(stats.close)} />
          <Stat label={t.song.different} value={`${stats.differentPct}%`} detail={t.song.lineCount(stats.different + stats.missing)} />
          <Stat label={t.song.lines} value={String(stats.total)} detail={t.song.scored} />
        </div>
      </section>

      {visible.map((line) => (
        <article key={line.index} className="surface p-5 md:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-muted-foreground">{t.song.line(line.index + 1)}</span>
            <Badge variant={matchVariant[line.match]}>{t.song[line.match]}</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Column label={t.song.original} text={line.original} />
            <Column label={t.song.myTranslation} text={line.mine} empty={t.song.mineEmpty} />
            <Column label={t.song.official} text={line.reference} empty={t.song.officialEmpty} />
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
