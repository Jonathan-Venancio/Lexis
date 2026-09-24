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
import { useI18n } from "@/i18n";
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
  const { t } = useI18n();
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      if (sentence) {
        await updateSentence(sentence.id, form);
        toast.success(t.sentenceForm.updated);
        onSaved?.({ ...sentence, ...form });
      } else {
        const created = await addSentence(form);
        toast.success(t.sentenceForm.added, {
          description: detected.length > 0 ? t.sentenceForm.linked(detected.length) : undefined,
        });
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
      <DialogContent>
        <form onSubmit={submit} className="contents">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-extrabold">
              {sentence ? t.sentenceForm.edit : t.sentenceForm.add}
            </DialogTitle>
            <DialogDescription>{t.sentenceForm.hint}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="s-text">{t.sentenceForm.english}</Label>
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
                    <span className="text-xs text-muted-foreground">{t.sentenceForm.detected}</span>
                    {detected.map((w) => (
                      <Badge key={w.id} variant="grape-soft">
                        {w.term}
                      </Badge>
                    ))}
                  </>
                ) : (
                  form.text.trim() && (
                    <span className="text-xs text-muted-foreground">{t.sentenceForm.none}</span>
                  )
                )}
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="s-translation">{t.sentenceForm.translation}</Label>
              <Input
                id="s-translation"
                placeholder="A maçã é vermelha."
                value={form.translation ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, translation: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="s-notes">{t.sentenceForm.notes}</Label>
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
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="pop" disabled={!canSave}>
              {saving ? t.common.saving : sentence ? t.common.saveChanges : t.sentenceForm.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
