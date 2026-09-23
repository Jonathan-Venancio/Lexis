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
        toast.success("Song updated");
        onSaved?.({ ...song, ...form });
      } else {
        const s = addSong(form);
        toast.success(`"${s.title}" added`);
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
              {song ? "Edit song" : "Add song"}
            </DialogTitle>
            <DialogDescription>
              Paste the lyrics line by line — each line becomes a comparison card.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="song-title">Song title</Label>
                <Input id="song-title" autoFocus value={form.title} onChange={(e) => set("title", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="song-artist">Artist</Label>
                <Input id="song-artist" value={form.artist} onChange={(e) => set("artist", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="song-album">Album (optional)</Label>
                <Input id="song-album" value={form.album ?? ""} onChange={(e) => set("album", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="song-url">YouTube / Spotify URL (optional)</Label>
                <Input id="song-url" placeholder="https://" value={form.url ?? ""} onChange={(e) => set("url", e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="song-lyrics">Lyrics in English</Label>
              <Textarea id="song-lyrics" rows={6} className="font-mono text-sm" value={form.lyrics} onChange={(e) => set("lyrics", e.target.value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="song-mine">My translation</Label>
                <Textarea id="song-mine" rows={5} className="font-mono text-sm" value={form.myTranslation} onChange={(e) => set("myTranslation", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="song-ref">Reference translation</Label>
                <Textarea id="song-ref" rows={5} className="font-mono text-sm" value={form.referenceTranslation} onChange={(e) => set("referenceTranslation", e.target.value)} />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="pop" disabled={!canSave}>
              {saving ? "Saving…" : song ? "Save changes" : "Add song"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
