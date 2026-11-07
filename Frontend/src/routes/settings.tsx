import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAppData } from "@/hooks/useAppData";
import { messagesFor, readLocale, useI18n, type Locale } from "@/i18n";
import { PageHeader, PageLoading } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { api } from "@/services/api";
import {
  deviceHasPushSubscription,
  pushSupport,
  subscribeOnThisDevice,
  unsubscribeOnThisDevice,
  type PushSupport,
} from "@/services/push";

export const Route = createFileRoute("/settings")({
  head: () => {
    const copy = messagesFor(readLocale());
    return {
      meta: [
        { title: copy.meta.settings },
        { name: "description", content: copy.meta.settingsDescription },
        { property: "og:title", content: copy.meta.settings },
        { property: "og:description", content: copy.meta.settingsDescription },
      ],
    };
  },
  component: SettingsPage,
});

function SettingsPage() {
  const { ready, profile, words, sentences, songs, theme, setTheme, updateProfile, logout } = useAppData();
  const { t, locale, setLocale } = useI18n();
  const [name, setName] = useState(profile.name);
  const [goal, setGoal] = useState(String(profile.dailyGoal));
  const [emailOn, setEmailOn] = useState(profile.emailReminders);
  const [reminderTime, setReminderTime] = useState(profile.reminderTime || "19:00");
  const [lateOn, setLateOn] = useState(Boolean(profile.reminderLateTime));
  const [lateTime, setLateTime] = useState(profile.reminderLateTime || "23:00");
  const [saving, setSaving] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushDevice, setPushDevice] = useState<PushSupport | "on" | "off" | "denied">("off");

  useEffect(() => {
    setName(profile.name);
    setGoal(String(profile.dailyGoal));
    setEmailOn(profile.emailReminders);
    setReminderTime(profile.reminderTime || "19:00");
    setLateOn(Boolean(profile.reminderLateTime));
    setLateTime(profile.reminderLateTime || "23:00");
  }, [profile]);

  useEffect(() => {
    const support = pushSupport();
    if (support !== "ok") {
      setPushDevice(support);
      return;
    }
    if (Notification.permission === "denied") {
      setPushDevice("denied");
      return;
    }
    void deviceHasPushSubscription()
      .then((active) => setPushDevice(active ? "on" : "off"))
      .catch(() => setPushDevice("off"));
  }, []);

  const enablePush = async () => {
    if (!profile.pushReady || !profile.pushPublicKey || pushBusy) return;
    setPushBusy(true);
    try {
      const keys = await subscribeOnThisDevice(profile.pushPublicKey);
      await api.savePushSubscription(keys);
      setPushDevice("on");
      toast.success(t.settings.pushSaved);
    } catch (error) {
      if (error instanceof Error && error.message === "denied") setPushDevice("denied");
      toast.error(error instanceof Error && error.message === "denied" ? t.settings.pushDenied : t.settings.pushFailed);
    } finally {
      setPushBusy(false);
    }
  };

  const disablePush = async () => {
    if (pushBusy) return;
    setPushBusy(true);
    try {
      const endpoint = await unsubscribeOnThisDevice();
      if (endpoint) await api.deletePushSubscription(endpoint);
      setPushDevice("off");
    } catch {
      toast.error(t.common.failed);
    } finally {
      setPushBusy(false);
    }
  };

  if (!ready) return <PageLoading />;

  const goalNumber = Number(goal);
  const goalValid = Number.isInteger(goalNumber) && goalNumber >= 1 && goalNumber <= 50;
  const orderOk = !lateOn || (reminderTime !== "" && lateTime > reminderTime);
  const canSave = name.trim().length > 0 && goalValid && orderOk && reminderTime !== "" && !saving;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        dailyGoal: goalNumber,
        emailReminders: emailOn,
        reminderTime,
        reminderLateTime: lateOn ? lateTime : null,
      });
      toast.success(t.settings.saved);
    } catch {
      toast.error(t.common.failed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade-up mx-auto max-w-3xl">
      <PageHeader title={t.settings.title} description={t.settings.description} />

      <form onSubmit={save} className="surface-lg grid gap-5 p-6 md:p-8">
        <div className="grid gap-1.5">
          <Label htmlFor="profile-email">{t.settings.email}</Label>
          <Input
            id="profile-email"
            value={profile.email}
            readOnly
            className="h-11 rounded-2xl bg-background text-muted-foreground"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="profile-name">{t.settings.name}</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Alex"
            className="h-11 rounded-2xl bg-background"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="daily-goal">{t.settings.goal}</Label>
          <Input
            id="daily-goal"
            type="number"
            min={1}
            max={50}
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            className="h-11 rounded-2xl bg-background"
          />
          <p className="text-xs text-muted-foreground">{t.settings.goalHint}</p>
          {!goalValid && goal.trim() !== "" && (
            <p className="text-xs font-semibold text-coral">{t.settings.goalError}</p>
          )}
        </div>
        <div>
          <div className="text-sm font-semibold">{t.settings.language}</div>
          <p className="mt-1 text-xs text-muted-foreground">{t.settings.languageHint}</p>
          <div className="mt-2 flex gap-2">
            {(["pt", "en"] as const satisfies readonly Locale[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setLocale(mode)}
                className={cn(
                  "cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  locale === mode ? "bg-ink text-ink-foreground" : "bg-background text-foreground hover:bg-background/70",
                )}
              >
                {mode === "pt" ? t.settings.portuguese : t.settings.english}
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold">{t.settings.theme}</div>
          <div className="mt-2 flex gap-2">
            {(["light", "dark"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setTheme(mode)}
                className={cn(
                  "cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  theme === mode ? "bg-ink text-ink-foreground" : "bg-background text-foreground hover:bg-background/70",
                )}
              >
                {mode === "light" ? t.theme.light : t.theme.dark}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 border-t border-border pt-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold">{t.settings.reminders}</div>
              <p className="mt-1 text-xs text-muted-foreground">{t.settings.remindersHint}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t.settings.reminderDestination}</p>
            </div>
            <Switch checked={emailOn} onCheckedChange={setEmailOn} aria-label={t.settings.reminders} />
          </div>
          <div className="flex items-start justify-between gap-4 border-t border-border pt-4">
            <div>
              <div className="text-sm font-semibold">{t.settings.push}</div>
              <p className="mt-1 text-xs text-muted-foreground">{t.settings.pushHint}</p>
              {pushDevice === "on" && <p className="mt-1 text-xs text-muted-foreground">{t.settings.pushOn}</p>}
              {pushDevice === "denied" && <p className="mt-1 text-xs font-semibold text-coral">{t.settings.pushDenied}</p>}
              {pushDevice === "unsupported" && (
                <p className="mt-1 text-xs text-muted-foreground">{t.settings.pushUnsupported}</p>
              )}
              {pushDevice === "ios" && <p className="mt-1 text-xs text-muted-foreground">{t.settings.pushIos}</p>}
              {!profile.pushReady && <p className="mt-1 text-xs text-muted-foreground">{t.settings.pushNotReady}</p>}
            </div>
            {(pushDevice === "on" || pushDevice === "off") && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pushBusy || !profile.pushReady}
                onClick={pushDevice === "on" ? disablePush : enablePush}
              >
                {pushDevice === "on" ? t.settings.pushDisable : t.settings.pushEnable}
              </Button>
            )}
          </div>
          {(emailOn || pushDevice === "on") && (
            <div className="grid gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="reminder-time">{t.settings.reminderTime}</Label>
                <Input
                  id="reminder-time"
                  type="time"
                  value={reminderTime}
                  onChange={(event) => setReminderTime(event.target.value)}
                  className="h-11 rounded-2xl bg-background"
                />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold">{t.settings.reminderLate}</div>
                  <p className="mt-1 text-xs text-muted-foreground">{t.settings.reminderLateHint}</p>
                </div>
                <Switch checked={lateOn} onCheckedChange={setLateOn} aria-label={t.settings.reminderLate} />
              </div>
              {lateOn && (
                <div className="grid gap-1.5">
                  <Label htmlFor="reminder-late">{t.settings.reminderLate}</Label>
                  <Input
                    id="reminder-late"
                    type="time"
                    value={lateTime}
                    onChange={(event) => setLateTime(event.target.value)}
                    className="h-11 rounded-2xl bg-background"
                  />
                  {!orderOk && <p className="text-xs font-semibold text-coral">{t.settings.reminderOrder}</p>}
                </div>
              )}
              {emailOn && !profile.remindersReady && (
                <p className="text-xs text-muted-foreground">{t.settings.remindersNotReady}</p>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="pop" disabled={!canSave}>
            {t.common.saveChanges}
          </Button>
        </div>
      </form>

      <div className="mt-4 flex justify-end">
        <Button type="button" variant="outline" onClick={logout}>
          {t.settings.logout}
        </Button>
      </div>

      <section className="mt-4 grid grid-cols-3 gap-3">
        <Mini label={t.settings.words} value={words.length} />
        <Mini label={t.settings.sentences} value={sentences.length} />
        <Mini label={t.settings.songs} value={songs.length} />
      </section>
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
