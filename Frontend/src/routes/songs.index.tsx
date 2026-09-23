import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Music2, Plus, Search } from "lucide-react";
import { useAppData } from "@/hooks/useAppData";
import { messagesFor, readLocale, useI18n } from "@/i18n";
import { compareTranslations } from "@/lib/compare";
import { PageHeader, PageLoading } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";
import { SongFormDialog } from "@/components/songs/SongFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/songs/")({
  head: () => {
    const copy = messagesFor(readLocale());
    return {
      meta: [
        { title: copy.meta.songs },
        { name: "description", content: copy.meta.songsDescription },
        { property: "og:title", content: copy.meta.songs },
        { property: "og:description", content: copy.meta.songsDescription },
      ],
    };
  },
  component: SongsPage,
});

function SongsPage() {
  const { ready, songs } = useAppData();
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? songs.filter((song) =>
          [song.title, song.artist, song.album ?? "", song.lyrics].join("\n").toLowerCase().includes(q),
        )
      : songs;
    return [...filtered].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [songs, query]);

  if (!ready) return <PageLoading />;

  return (
    <div className="fade-up">
      <PageHeader
        title={t.songs.title}
        description={t.songs.description}
        actions={
          <Button variant="pop" onClick={() => setAddOpen(true)}>
            <Plus /> {t.songs.add}
          </Button>
        }
      />

      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t.songs.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 rounded-full bg-card pl-10"
          aria-label={t.songs.searchLabel}
        />
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={Music2}
          title={query ? t.songs.noMatch(query.trim()) : t.songs.empty}
          description={query ? t.songs.noMatchHint : t.songs.emptyHint}
          action={
            !query && (
              <Button variant="ink" onClick={() => setAddOpen(true)}>
                <Plus /> {t.songs.add}
              </Button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {list.map((song) => {
            const { stats } = compareTranslations(song.lyrics, song.myTranslation, song.referenceTranslation);
            const started = song.myTranslation.trim().length > 0;
            return (
              <Link
                key={song.id}
                to="/songs/$songId"
                params={{ songId: song.id }}
                search={{ tab: started ? "compare" : "lyrics" }}
                className="surface flex flex-col p-6 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="font-display text-2xl font-extrabold leading-tight">{song.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {song.artist}
                  {song.album ? ` · ${song.album}` : ""}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {started ? (
                    <>
                      <Badge variant="mint-soft">{t.songs.correct} {stats.correctPct}%</Badge>
                      <Badge variant="sun-soft">{t.songs.close} {stats.closePct}%</Badge>
                      <Badge variant="coral-soft">{t.songs.different} {stats.differentPct}%</Badge>
                    </>
                  ) : (
                    <Badge variant="muted">{t.songs.notStarted}</Badge>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <SongFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSaved={(song) => {
          navigate({
            to: "/songs/$songId",
            params: { songId: song.id },
            search: { tab: "lyrics" },
          });
        }}
      />
    </div>
  );
}
