import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppData } from "@/hooks/useAppData";
import { useI18n } from "@/i18n";
import type { Song, SongInput } from "@/types";

interface SongFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  song?: Song;
  onSaved?: (song: Song) => void;
}

type SongMeta = Pick<SongInput, "title" | "artist" | "album" | "url">;

const empty: SongMeta = {
  title: "",
  artist: "",
  album: "",
  url: "",
};

export function SongFormDialog({ open, onOpenChange, song, onSaved }: SongFormDialogProps) {
  const { addSong, updateSong } = useAppData();
  const { t } = useI18n();
  const [form, setForm] = useState<SongMeta>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        song
          ? {
              title: song.title,
              artist: song.artist,
              album: song.album ?? "",
              url: song.url ?? "",
            }
          : empty,
      );
    }
  }, [open, song]);

  const set = <K extends keyof SongMeta>(k: K, v: SongMeta[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const canSave = form.title.trim() && form.artist.trim() && !saving;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      if (song) {
        await updateSong(song.id, form);
        toast.success(t.songForm.updated);
        onSaved?.({ ...song, ...form });
      } else {
        const created = await addSong({
          ...form,
          lyrics: "",
          myTranslation: "",
          referenceTranslation: "",
        });
        toast.success(t.songForm.added(created.title));
        onSaved?.(created);
      }
      onOpenChange(false);
    } catch {
      toast.error(t.common.failed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-extrabold">
              {song ? t.songForm.edit : t.songForm.add}
            </DialogTitle>
            <DialogDescription>{t.songForm.hint}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="song-title">{t.songForm.title}</Label>
                <Input id="song-title" autoFocus value={form.title} onChange={(e) => set("title", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="song-artist">{t.songForm.artist}</Label>
                <Input id="song-artist" value={form.artist} onChange={(e) => set("artist", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="song-album">{t.songForm.album}</Label>
                <Input id="song-album" value={form.album ?? ""} onChange={(e) => set("album", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="song-url">{t.songForm.url}</Label>
                <Input id="song-url" placeholder="https://" value={form.url ?? ""} onChange={(e) => set("url", e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="pop" disabled={!canSave}>
              {saving ? t.common.saving : song ? t.common.saveChanges : t.songForm.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
