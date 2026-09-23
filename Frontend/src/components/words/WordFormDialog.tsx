import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppData } from "@/hooks/useAppData";
import type { PartOfSpeech, Word, WordInput } from "@/types";

const PARTS: PartOfSpeech[] = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "conjunction",
  "preposition",
  "pronoun",
  "other",
];

interface WordFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided, the dialog edits this word instead of creating a new one. */
  word?: Word;
  onSaved?: (word: Word) => void;
}

const empty: WordInput = {
  term: "",
  translation: "",
  definition: "",
  example: "",
  notes: "",
  partOfSpeech: undefined,
};

export function WordFormDialog({ open, onOpenChange, word, onSaved }: WordFormDialogProps) {
  const { addWord, updateWord, findDuplicate } = useAppData();
  const navigate = useNavigate();
  const [form, setForm] = useState<WordInput>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        word
          ? {
              term: word.term,
              translation: word.translation,
              definition: word.definition,
              example: word.example,
              notes: word.notes ?? "",
              partOfSpeech: word.partOfSpeech,
            }
          : empty,
      );
    }
  }, [open, word]);

  const duplicate = form.term.trim() ? findDuplicate(form.term, word?.id) : undefined;
  const canSave = Boolean(form.term.trim() && form.translation.trim() && !duplicate && !saving);

  const set = <K extends keyof WordInput>(key: K, value: WordInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const showDuplicateToast = (existing: Word) => {
    toast.error("Word already exists in your vocabulary.", {
      description: `"${existing.term}" is already saved.`,
      action: {
        label: "View word",
        onClick: () => navigate({ to: "/vocabulary/$wordId", params: { wordId: existing.id } }),
      },
    });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    // Small simulated latency so the UI shows a saving state
    window.setTimeout(() => {
      if (word) {
        const res = updateWord(word.id, form);
        if (!res.ok) {
          showDuplicateToast(res.existing);
        } else {
          toast.success("Word updated");
          onSaved?.({ ...word, ...form });
          onOpenChange(false);
        }
      } else {
        const res = addWord(form);
        if (!res.ok) {
          showDuplicateToast(res.existing);
        } else {
          toast.success(`"${res.word.term}" added to your vocabulary`);
          onSaved?.(res.word);
          onOpenChange(false);
        }
      }
      setSaving(false);
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-extrabold">
              {word ? "Edit word" : "Add word"}
            </DialogTitle>
            <DialogDescription>
              {word
                ? "Update the details of this word."
                : "Add a new word to your personal vocabulary."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="term">Word</Label>
              <Input
                id="term"
                autoFocus
                placeholder="achieve"
                value={form.term}
                onChange={(e) => set("term", e.target.value)}
                aria-invalid={!!duplicate}
              />
              {duplicate && (
                <p className="text-xs font-semibold text-coral">
                  This word already exists in your vocabulary.{" "}
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={() => {
                      onOpenChange(false);
                      navigate({ to: "/vocabulary/$wordId", params: { wordId: duplicate.id } });
                    }}
                  >
                    View word
                  </button>
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
              <div className="grid gap-1.5">
                <Label htmlFor="translation">Meaning / Translation</Label>
                <Input
                  id="translation"
                  placeholder="alcançar / conseguir"
                  value={form.translation}
                  onChange={(e) => set("translation", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Part of speech</Label>
                <Select
                  value={form.partOfSpeech ?? ""}
                  onValueChange={(v) => set("partOfSpeech", v as PartOfSpeech)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="definition">Definition in English</Label>
              <Textarea
                id="definition"
                rows={2}
                placeholder="to succeed in doing something after making an effort"
                value={form.definition}
                onChange={(e) => set("definition", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="example">Example sentence</Label>
              <Textarea
                id="example"
                rows={2}
                placeholder="She worked hard to achieve her goals."
                value={form.example}
                onChange={(e) => set("example", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="Anything that helps you remember it"
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="pop" disabled={!canSave}>
              {saving ? "Saving…" : word ? "Save changes" : "Add word"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
