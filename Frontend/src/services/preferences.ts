import type { Locale } from "@/i18n";
import type { ThemeMode } from "@/types";

const THEME_KEY = "lexis:theme";
const THEME_LEGACY = "lingo:theme";
const LOCALE_KEY = "lexis:locale";

function rawItem(key: string, legacy?: string): string | null {
  const current = window.localStorage.getItem(key);
  if (current != null) return current;
  if (!legacy) return null;
  const previous = window.localStorage.getItem(legacy);
  if (previous == null) return null;
  window.localStorage.setItem(key, previous);
  return previous;
}

/** Theme and language stay in the browser. Study data lives on the API. */
export const preferences = {
  getTheme(): ThemeMode | null {
    const theme = rawItem(THEME_KEY, THEME_LEGACY);
    return theme === "dark" || theme === "light" ? theme : null;
  },
  setTheme(mode: ThemeMode) {
    window.localStorage.setItem(THEME_KEY, mode);
  },
  getLocale(): Locale {
    return rawItem(LOCALE_KEY) === "en" ? "en" : "pt";
  },
  setLocale(locale: Locale) {
    window.localStorage.setItem(LOCALE_KEY, locale);
  },
};
