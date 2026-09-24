import { useEffect, useMemo, useState } from "react";
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
import { useI18n } from "@/i18n";
import { normalizeWord } from "@/lib/text";
import type { Word } from "@/types";
import { cn } from "@/lib/utils";

function WordPicker({
  words,
  selected,
  onToggle,
  emptyLabel,
}: {
  words: Word[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  emptyLabel: string;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const q = normalizeWord(query);
  const visible = useMemo(
    () =>
      words.filter((word) => {
        if (!q) return true;
        return normalizeWord(word.term).includes(q) || word.translation.toLowerCase().includes(q);
      }),
    [words, q],
  );

  return (
    <div className="grid gap-2">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t.review.searchWords}
        aria-label={t.review.searchWords}
      />
      {words.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.review.noneMatch}</p>
      ) : (
        <ul className="grid max-h-64 gap-1 overflow-y-auto pr-1">
          {visible.map((word) => {
            const on = selected.has(word.id);
            return (
              <li key={word.id}>
                <button
                  type="button"
                  onClick={() => onToggle(word.id)}
                  aria-pressed={on}
                  className={cn(
                    "flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    on ? "bg-ink text-ink-foreground" : "bg-background hover:bg-background/70",
                  )}
                >
                  <span className="font-display font-extrabold">{word.term}</span>
                  <span className={cn("truncate text-sm", on ? "text-ink-foreground/70" : "text-muted-foreground")}>
                    {word.translation}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function CreateDeckDialog({
  open,
  onOpenChange,
  words,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  words: Word[];
  onCreate: (name: string, wordIds: string[]) => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setSelected(new Set());
      setTouched(false);
    }
  }, [open]);

  const trimmed = name.trim();
  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          className="contents"
          onSubmit={async (event) => {
            event.preventDefault();
            setTouched(true);
            if (!trimmed) return;
            await onCreate(trimmed, [...selected]);
            onOpenChange(false);
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-extrabold">{t.review.createTitle}</DialogTitle>
            <DialogDescription>{t.review.createHint}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="deck-name">{t.review.themeName}</Label>
              <Input
                id="deck-name"
                autoFocus
                value={name}
                placeholder={t.review.themePlaceholder}
                onChange={(event) => setName(event.target.value)}
                aria-invalid={touched && !trimmed}
              />
              {touched && !trimmed && <p className="text-xs font-semibold text-coral">{t.review.themeMissing}</p>}
            </div>
            <div className="grid gap-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <Label>{t.review.pick}</Label>
                <span className="text-xs text-muted-foreground">{t.review.selected(selected.size)}</span>
              </div>
              <p className="text-xs text-muted-foreground">{t.review.pickHint}</p>
              <WordPicker words={words} selected={selected} onToggle={toggle} emptyLabel={t.review.noneAvailable} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="pop">
              {t.review.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function IncludeWordsDialog({
  open,
  onOpenChange,
  words,
  onInclude,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  words: Word[];
  onInclude: (wordIds: string[]) => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open) setSelected(new Set());
  }, [open]);

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          className="contents"
          onSubmit={async (event) => {
            event.preventDefault();
            if (selected.size === 0) return;
            await onInclude([...selected]);
            onOpenChange(false);
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-extrabold">{t.review.includeTitle}</DialogTitle>
            <DialogDescription>{t.review.includeHint}</DialogDescription>
          </DialogHeader>
          {words.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t.review.includeEmpty}</p>
          ) : (
            <WordPicker words={words} selected={selected} onToggle={toggle} emptyLabel={t.review.includeEmpty} />
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit" variant="pop" disabled={selected.size === 0}>
              {t.review.includeSave}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
