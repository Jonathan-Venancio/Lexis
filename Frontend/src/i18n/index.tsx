import { useRouterState } from "@tanstack/react-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en } from "@/i18n/en";
import { pt, type Messages } from "@/i18n/pt";
import { repository } from "@/services/repository";

export type Locale = "pt" | "en";
export type { Messages };

const dictionaries: Record<Locale, Messages> = { pt, en };

export function readLocale(): Locale {
  if (typeof window === "undefined") return "pt";
  return repository.getLocale();
}

export function messagesFor(locale: Locale): Messages {
  return dictionaries[locale];
}

export function titleForPath(pathname: string, t: Messages): string {
  const path = pathname.replace(/\/$/, "") || "/";
  if (path.startsWith("/vocabulary/")) return t.meta.word;
  if (path === "/vocabulary") return t.meta.vocabulary;
  if (path.startsWith("/sentences/")) return t.meta.sentence;
  if (path === "/sentences") return t.meta.sentences;
  if (path.startsWith("/songs/")) return t.meta.song;
  if (path === "/songs") return t.meta.songs;
  if (path === "/review") return t.meta.review;
  if (path === "/settings") return t.meta.settings;
  return t.meta.home;
}

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("pt");
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  useEffect(() => {
    setLocaleState(readLocale());
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    repository.setLocale(next);
    document.documentElement.lang = next;
  }, []);

  const t = dictionaries[locale];

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = titleForPath(pathname, t);
  }, [locale, pathname, t]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
