import { Link } from "@tanstack/react-router";
import {
  BookOpenText,
  Flame,
  LayoutGrid,
  Moon,
  Music2,
  Quote,
  RotateCcw,
  Settings,
  Sun,
} from "lucide-react";
import type { ReactNode } from "react";
import { useAppData } from "@/hooks/useAppData";
import { useI18n } from "@/i18n";
import { dueWords } from "@/lib/srs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", labelKey: "home", icon: LayoutGrid, exact: true },
  { to: "/vocabulary", labelKey: "vocabulary", icon: BookOpenText },
  { to: "/sentences", labelKey: "sentences", icon: Quote },
  { to: "/review", labelKey: "review", icon: RotateCcw },
  { to: "/songs", labelKey: "songs", icon: Music2 },
] as const;

function Logo({ small }: { small?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2 px-2">
      <span
        className={cn(
          "grid place-items-center rounded-[14px] bg-ink font-display font-extrabold text-ink-foreground",
          small ? "size-8 rounded-xl text-base" : "size-9 text-lg",
        )}
      >
        L
      </span>
      <span className={cn("font-display font-extrabold", small ? "text-lg" : "text-xl")}>Lexis</span>
    </Link>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme } = useAppData();
  const { t } = useI18n();
  const dark = theme === "dark";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={dark ? t.theme.toLight : t.theme.toDark}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full border-2 border-ink px-3 text-sm font-bold transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
          <span className="hidden sm:inline">{dark ? t.theme.dark : t.theme.light}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent>{t.theme.toggle}</TooltipContent>
    </Tooltip>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { ready, loadError, reload, words, profile } = useAppData();
  const { t } = useI18n();
  const due = ready ? dueWords(words).length : 0;

  if (loadError) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-6 text-center text-foreground">
        <div className="max-w-md">
          <h1 className="font-display text-3xl font-extrabold">{t.common.offline}</h1>
          <p className="mt-2 text-muted-foreground">{t.common.offlineHint}</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="mt-6 inline-flex h-10 cursor-pointer items-center rounded-full bg-ink px-5 text-sm font-bold text-ink-foreground"
          >
            {t.common.retry}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col gap-1 p-5 lg:flex">
        <div className="mb-6">
          <Logo />
        </div>
        <nav className="flex flex-col gap-1" aria-label={t.nav.main}>
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: "exact" in item && item.exact }}
              className="flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[status=active]:bg-ink data-[status=active]:text-ink-foreground data-[status=active]:hover:bg-ink"
            >
              <item.icon className="size-[18px]" />
              {t.nav[item.labelKey]}
              {item.to === "/review" && due > 0 && (
                <span className="ml-auto rounded-full bg-coral px-2 py-0.5 text-[11px] font-bold text-coral-foreground">
                  {due}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 rounded-2xl bg-sun/40 p-3">
          <span className="grid size-9 place-items-center rounded-xl bg-sun text-sun-foreground">
            <Flame className="size-5" />
          </span>
          <div>
            <div className="font-display text-lg font-extrabold leading-none">
              {t.streak.count(profile.streakDays)}
            </div>
            <div className="text-xs text-muted-foreground">{t.streak.label}</div>
          </div>
        </div>
        <Link
          to="/settings"
          className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[status=active]:bg-ink data-[status=active]:text-ink-foreground"
        >
          <Settings className="size-4" />
          {t.nav.settings}
        </Link>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-4 px-5 py-4 md:px-10 md:py-5">
          <div className="lg:hidden">
            <Logo small />
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link
              to="/settings"
              aria-label={t.nav.settings}
              className="grid size-9 place-items-center rounded-full border-2 border-ink transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
            >
              <Settings className="size-4" />
            </Link>
          </div>
        </header>

        <main className="flex-1 px-5 pb-28 md:px-10 lg:pb-12">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label={t.nav.mainMobile}
        className="fixed inset-x-0 bottom-0 z-40 flex justify-center gap-2 border-t border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden"
      >
        {nav.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: "exact" in item && item.exact }}
            aria-label={t.nav[item.labelKey]}
            className="relative grid size-12 place-items-center rounded-2xl bg-card text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[status=active]:bg-ink data-[status=active]:text-ink-foreground"
          >
            <item.icon className="size-5" />
            {item.to === "/review" && due > 0 && (
              <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-coral px-1 text-[10px] font-bold text-coral-foreground">
                {due}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="text-sm text-muted-foreground">{eyebrow}</div>}
        <h1 className="font-display text-3xl font-extrabold md:text-4xl">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function PageLoading() {
  return (
    <div className="grid gap-4">
      <div className="h-10 w-64 animate-pulse rounded-2xl bg-card" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-40 animate-pulse rounded-3xl bg-card md:col-span-2" />
        <div className="h-40 animate-pulse rounded-3xl bg-card" />
      </div>
      <div className="h-64 animate-pulse rounded-3xl bg-card" />
    </div>
  );
}
