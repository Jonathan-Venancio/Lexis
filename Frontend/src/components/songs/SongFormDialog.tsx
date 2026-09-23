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
import { Textarea } from "@/components/ui/textarea";
import { useAppData } from "@/hooks/useAppData";
import { useI18n } from "@/i18n";
import type { Song, SongInput } from "@/types";

interface SongFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  song?: Song;
  onSaved?: (song: Song) => void;
}

const empty: SongInput = {
  title: "",
  artist: "",
  album: "",
  url: "",
  lyrics: "",
  myTranslation: "",
  referenceTranslation: "",
};

export function SongFormDialog({ open, onOpenChange, song, onSaved }: SongFormDialogProps) {
  const { addSong, updateSong } = useAppData();
  const { t } = useI18n();
  const [form, setForm] = useState<SongInput>(empty);
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
              lyrics: song.lyrics,
              myTranslation: song.myTranslation,
              referenceTranslation: song.referenceTranslation,
            }
          : empty,
      );
    }
  }, [open, song]);

  const set = <K extends keyof SongInput>(k: K, v: SongInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const canSave = form.title.trim() && form.artist.trim() && form.lyrics.trim() && !saving;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    window.setTimeout(() => {
      if (song) {
        updateSong(song.id, form);
        toast.success(t.songForm.updated);
        onSaved?.({ ...song, ...form });
      } else {
        const s = addSong(form);
        toast.success(t.songForm.added(s.title));
        onSaved?.(s);
      }
      setSaving(false);
      onOpenChange(false);
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
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
            <div className="grid gap-1.5">
              <Label htmlFor="song-lyrics">{t.songForm.lyrics}</Label>
              <Textarea id="song-lyrics" rows={6} className="font-mono text-sm" value={form.lyrics} onChange={(e) => set("lyrics", e.target.value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="song-mine">{t.songForm.mine}</Label>
                <Textarea id="song-mine" rows={5} className="font-mono text-sm" value={form.myTranslation} onChange={(e) => set("myTranslation", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="song-ref">{t.songForm.reference}</Label>
                <Textarea id="song-ref" rows={5} className="font-mono text-sm" value={form.referenceTranslation} onChange={(e) => set("referenceTranslation", e.target.value)} />
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
