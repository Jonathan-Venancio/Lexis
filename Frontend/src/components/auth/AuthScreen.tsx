import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { ApiError } from "@/services/api";
import { useAppData } from "@/hooks/useAppData";
import { useI18n, type Locale } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function AuthScreen() {
  const { login, register, theme, toggleTheme } = useAppData();
  const { t, locale, setLocale } = useI18n();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (mode === "register" && name.trim().length === 0) {
      setError(t.auth.nameRequired);
      return;
    }
    if (password.length < 8) {
      setError(t.auth.passwordHint);
      return;
    }
    setSubmitting(true);
    try {
      if (mode === "login") await login(email.trim(), password);
      else await register(email.trim(), password, name.trim());
    } catch (caught) {
      setError(messageFor(caught, t.auth, t.common.failed));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-6 py-10 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-[14px] bg-ink font-display text-lg font-extrabold text-ink-foreground">
              L
            </span>
            <span className="font-display text-xl font-extrabold">{t.auth.title}</span>
          </div>
          <div className="flex items-center gap-2">
            {(["pt", "en"] as const satisfies readonly Locale[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setLocale(mode)}
                className={cn(
                  "cursor-pointer rounded-full px-3 py-1 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  locale === mode ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:bg-card",
                )}
              >
                {mode === "pt" ? "PT" : "EN"}
              </button>
            ))}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? t.theme.toLight : t.theme.toDark}
              className="grid size-9 cursor-pointer place-items-center rounded-full border-2 border-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </button>
          </div>
        </div>

        <form onSubmit={(event) => void submit(event)} className="surface-lg grid gap-4 p-6 md:p-8">
          <div>
            <h1 className="font-display text-3xl font-extrabold">
              {mode === "login" ? t.auth.login : t.auth.register}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t.auth.subtitle}</p>
          </div>

          {mode === "register" && (
            <div className="grid gap-1.5">
              <Label htmlFor="auth-name">{t.auth.name}</Label>
              <Input
                id="auth-name"
                value={name}
                autoComplete="name"
                onChange={(event) => setName(event.target.value)}
                className="h-11 rounded-2xl bg-background"
              />
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="auth-email">{t.auth.email}</Label>
            <Input
              id="auth-email"
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-2xl bg-background"
              required
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="auth-password">{t.auth.password}</Label>
            <Input
              id="auth-password"
              type="password"
              value={password}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 rounded-2xl bg-background"
              required
            />
            {mode === "register" && <p className="text-xs text-muted-foreground">{t.auth.passwordHint}</p>}
          </div>

          {error && <p className="text-sm font-semibold text-coral">{error}</p>}

          <Button type="submit" variant="pop" disabled={submitting} className="h-11">
            {mode === "login" ? t.auth.submitLogin : t.auth.submitRegister}
          </Button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError(null);
            }}
            className="cursor-pointer text-sm font-bold text-muted-foreground underline-offset-4 hover:underline"
          >
            {mode === "login" ? t.auth.switchToRegister : t.auth.switchToLogin}
          </button>
        </form>
      </div>
    </div>
  );
}

function messageFor(
  error: unknown,
  auth: {
    invalid: string;
    taken: string;
    invalidEmail: string;
    passwordHint: string;
    nameRequired: string;
  },
  fallback: string,
): string {
  if (!(error instanceof ApiError)) return fallback;
  if (error.status === 401) return auth.invalid;
  if (error.status === 409) return auth.taken;
  const detail = (error.body as { detail?: unknown } | null)?.detail;
  const text = typeof detail === "string" ? detail : "";
  if (text === "Invalid email") return auth.invalidEmail;
  if (text.startsWith("Password")) return auth.passwordHint;
  if (text === "Name is required") return auth.nameRequired;
  return fallback;
}
