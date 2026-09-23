import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppData } from "@/hooks/useAppData";
import { PageHeader, PageLoading } from "@/components/layout/AppShell";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Lingo" },
      { name: "description", content: "Set your name, daily word goal and theme." },
      { property: "og:title", content: "Settings — Lingo" },
      { property: "og:description", content: "Set your name, daily word goal and theme." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { ready, profile, words, sentences, songs, theme, setTheme, updateProfile, resetDemoData } =
    useAppData();
  const [name, setName] = useState(profile.name);
  const [goal, setGoal] = useState(String(profile.dailyGoal));
  const [resetOpen, setResetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(profile.name);
    setGoal(String(profile.dailyGoal));
  }, [profile.name, profile.dailyGoal]);

  if (!ready) return <PageLoading />;

  const goalNumber = Number(goal);
  const goalValid = Number.isInteger(goalNumber) && goalNumber >= 1 && goalNumber <= 50;
  const canSave = name.trim().length > 0 && goalValid && !saving;

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    updateProfile({ name: name.trim(), dailyGoal: goalNumber });
    toast.success("Settings saved");
    setSaving(false);
  };

  return (
    <div className="fade-up mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Your name, daily goal and the look of the app." />

      <form onSubmit={save} className="surface-lg grid gap-5 p-6 md:p-8">
        <div className="grid gap-1.5">
          <Label htmlFor="profile-name">Name</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Alex"
            className="h-11 rounded-2xl bg-background"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="daily-goal">Daily goal</Label>
          <Input
            id="daily-goal"
            type="number"
            min={1}
            max={50}
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            className="h-11 rounded-2xl bg-background"
          />
          <p className="text-xs text-muted-foreground">How many new words you want to add each day. From 1 to 50.</p>
          {!goalValid && goal.trim() !== "" && (
            <p className="text-xs font-semibold text-coral">Enter a whole number between 1 and 50.</p>
          )}
        </div>
        <div>
          <div className="text-sm font-semibold">Theme</div>
          <div className="mt-2 flex gap-2">
            {(["light", "dark"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTheme(mode)}
                className={cn(
                  "cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  theme === mode ? "bg-ink text-ink-foreground" : "bg-background text-foreground hover:bg-background/70",
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="pop" disabled={!canSave}>
            Save changes
          </Button>
        </div>
      </form>

      <section className="mt-4 grid grid-cols-3 gap-3">
        <Mini label="Words" value={words.length} />
        <Mini label="Sentences" value={sentences.length} />
        <Mini label="Songs" value={songs.length} />
      </section>

      <section className="surface mt-4 p-6 md:p-8">
        <h2 className="font-display text-2xl font-extrabold">Demo data</h2>
        <p className="mt-1 max-w-lg text-sm text-muted-foreground">
          Everything you add is saved in this browser. Reset brings back the original sample words, sentences and songs.
        </p>
        <Button variant="outline" className="mt-4" onClick={() => setResetOpen(true)}>
          Reset demo data
        </Button>
      </section>

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title="Reset all data to the original demo data?"
        description="Words, sentences, songs and your daily goal return to the sample set."
        confirmLabel="Reset"
        destructive
        onConfirm={() => {
          void resetDemoData().then(() => toast.success("Demo data restored"));
        }}
      />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface p-4">
      <div className="text-xs font-semibold uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-3xl font-extrabold">{value}</div>
    </div>
  );
}
