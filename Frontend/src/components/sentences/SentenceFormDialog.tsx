import { useEffect, useMemo, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { useAppData } from "@/hooks/useAppData";
import { findWordsInSentence } from "@/lib/text";
import type { Sentence, SentenceInput } from "@/types";

interface SentenceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sentence?: Sentence;
  /** Pre-fill the English field (e.g. when adding from a word page). */
  initialText?: string;
  onSaved?: (sentence: Sentence) => void;
}

const empty: SentenceInput = { text: "", translation: "", notes: "" };

export function SentenceFormDialog({
  open,
  onOpenChange,
  sentence,
  initialText,
  onSaved,
}: SentenceFormDialogProps) {
  const { addSentence, updateSentence, words } = useAppData();
  const [form, setForm] = useState<SentenceInput>(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(
        sentence
          ? { text: sentence.text, translation: sentence.translation ?? "", notes: sentence.notes ?? "" }
          : { ...empty, text: initialText ?? "" },
      );
    }
  }, [open, sentence, initialText]);

  const detected = useMemo(
    () =>
      form.text.trim()
        ? findWordsInSentence({ id: "draft", text: form.text, createdAt: "" }, words)
        : [],
    [form.text, words],
  );

  const canSave = form.text.trim().length > 0 && !saving;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    window.setTimeout(() => {
      if (sentence) {
        updateSentence(sentence.id, form);
        toast.success("Sentence updated");
        onSaved?.({ ...sentence, ...form });
      } else {
        const s = addSentence(form);
        toast.success("Sentence added", {
          description:
            detected.length > 0
              ? `Linked to ${detected.length} vocabulary word${detected.length === 1 ? "" : "s"}.`
              : undefined,
        });
        onSaved?.(s);
      }
      setSaving(false);
      onOpenChange(false);
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-extrabold">
              {sentence ? "Edit sentence" : "Add sentence"}
            </DialogTitle>
            <DialogDescription>
              Vocabulary words are detected automatically as you type.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="s-text">English sentence</Label>
              <Textarea
                id="s-text"
                autoFocus
                rows={3}
                placeholder="The apple is red."
                value={form.text}
                onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              />
              <div className="flex min-h-6 flex-wrap items-center gap-1.5 pt-1">
                {detected.length > 0 ? (
                  <>
                    <span className="text-xs text-muted-foreground">Detected:</span>
                    {detected.map((w) => (
                      <Badge key={w.id} variant="grape-soft">
                        {w.term}
                      </Badge>
                    ))}
                  </>
                ) : (
                  form.text.trim() && (
                    <span className="text-xs text-muted-foreground">
                      No vocabulary words detected yet.
                    </span>
                  )
                )}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="s-translation">Translation (optional)</Label>
              <Input
                id="s-translation"
                placeholder="A maçã é vermelha."
                value={form.translation ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, translation: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="s-notes">Notes (optional)</Label>
              <Textarea
                id="s-notes"
                rows={2}
                value={form.notes ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="pop" disabled={!canSave}>
              {saving ? "Saving…" : sentence ? "Save changes" : "Add sentence"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
