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
import { useI18n } from "@/i18n";
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
  /** Also place a newly created word in this deck. The word still lives in the shared vocabulary. */
  deckId?: string;
  /** When the typed word already exists, offer to attach that same word to a deck. */
  onIncludeExisting?: (word: Word) => void;
}

const empty: WordInput = {
  term: "",
  translation: "",
  definition: "",
  example: "",
  notes: "",
  partOfSpeech: undefined,
};

export function WordFormDialog({ open, onOpenChange, word, onSaved, onIncludeExisting, deckId }: WordFormDialogProps) {
  const { addWord, updateWord, findDuplicate } = useAppData();
  const { t } = useI18n();
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
    toast.error(t.wordForm.exists, {
      description: t.wordForm.existsHint(existing.term),
      action: {
        label: t.wordForm.view,
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
          toast.success(t.wordForm.updated);
          onSaved?.({ ...word, ...form });
          onOpenChange(false);
        }
      } else {
        const res = addWord(form, deckId);
        if (!res.ok) {
          showDuplicateToast(res.existing);
        } else {
          toast.success(t.wordForm.added(res.word.term));
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
              {word ? t.wordForm.edit : t.wordForm.add}
            </DialogTitle>
            <DialogDescription>
              {word ? t.wordForm.editHint : t.wordForm.addHint}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="term">{t.wordForm.word}</Label>
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
                  {t.wordForm.duplicate}{" "}
                  <button
                    type="button"
                    className="underline underline-offset-2"
                    onClick={() => {
                      onOpenChange(false);
                      navigate({ to: "/vocabulary/$wordId", params: { wordId: duplicate.id } });
                    }}
                  >
                    {t.wordForm.view}
                  </button>
                  {onIncludeExisting && (
                    <>
                      {" · "}
                      <button
                        type="button"
                        className="underline underline-offset-2"
                        onClick={() => {
                          onIncludeExisting(duplicate);
                          onOpenChange(false);
                        }}
                      >
                        {t.review.includeThis}
                      </button>
                    </>
                  )}
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-[1fr_150px]">
              <div className="grid gap-1.5">
                <Label htmlFor="translation">{t.wordForm.meaning}</Label>
                <Input
                  id="translation"
                  placeholder="alcançar / conseguir"
                  value={form.translation}
                  onChange={(e) => set("translation", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{t.wordForm.pos}</Label>
                <Select
                  value={form.partOfSpeech ?? ""}
                  onValueChange={(v) => set("partOfSpeech", v as PartOfSpeech)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t.common.optional} />
                  </SelectTrigger>
                  <SelectContent>
                    {PARTS.map((p) => (
                      <SelectItem key={p} value={p}>
                        {t.pos[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="definition">{t.wordForm.definition}</Label>
              <Textarea
                id="definition"
                rows={2}
                placeholder="to succeed in doing something after making an effort"
                value={form.definition}
                onChange={(e) => set("definition", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="example">{t.wordForm.example}</Label>
              <Textarea
                id="example"
                rows={2}
                placeholder="She worked hard to achieve her goals."
                value={form.example}
                onChange={(e) => set("example", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="notes">{t.wordForm.notes}</Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder={t.wordForm.notesPlaceholder}
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="pop" disabled={!canSave}>
              {saving ? t.common.saving : word ? t.common.saveChanges : t.wordForm.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
