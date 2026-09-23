import type { Locale } from "@/i18n";
import type { AppData, Deck, Profile, Sentence, Song, ThemeMode, Word } from "@/types";
import { mockWords } from "@/data/mockWords";
import { mockSentences } from "@/data/mockSentences";
import { mockSongs } from "@/data/mockSongs";

/**
 * Data access boundary. The UI only talks to this interface, so swapping
 * localStorage for an HTTP API later means writing a new implementation
 * (e.g. `ApiRepository`) without touching components.
 */
export interface Repository {
  load(): Promise<AppData>;
  saveWords(words: Word[]): Promise<void>;
  saveSentences(sentences: Sentence[]): Promise<void>;
  saveSongs(songs: Song[]): Promise<void>;
  saveDecks(decks: Deck[]): Promise<void>;
  saveProfile(profile: Profile): Promise<void>;
  reset(): Promise<AppData>;
  getTheme(): ThemeMode | null;
  setTheme(mode: ThemeMode): void;
  getLocale(): Locale;
  setLocale(locale: Locale): void;
}

const KEYS = {
  words: "lexis:words",
  sentences: "lexis:sentences",
  songs: "lexis:songs",
  decks: "lexis:decks",
  profile: "lexis:profile",
  theme: "lexis:theme",
  locale: "lexis:locale",
  seeded: "lexis:seeded",
} as const;

const LEGACY = {
  words: "lingo:words",
  sentences: "lingo:sentences",
  songs: "lingo:songs",
  profile: "lingo:profile",
  theme: "lingo:theme",
  seeded: "lingo:seeded",
} as const;

export const defaultProfile: Profile = { name: "Alex", dailyGoal: 10, streakDays: 8 };

function buildDemoData(): AppData {
  return {
    words: mockWords.map((w) => ({ ...w })),
    sentences: mockSentences.map((s) => ({ ...s })),
    songs: mockSongs.map((s) => ({ ...s })),
    decks: [],
    profile: { ...defaultProfile },
  };
}

function rawItem(key: string, legacy?: string): string | null {
  const current = window.localStorage.getItem(key);
  if (current != null) return current;
  if (!legacy) return null;
  const previous = window.localStorage.getItem(legacy);
  if (previous == null) return null;
  window.localStorage.setItem(key, previous);
  return previous;
}

function read<T>(key: string, legacy?: string): T | null {
  try {
    const raw = rawItem(key, legacy);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

/** Small artificial delay so loading states are visible, like a real API. */
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class LocalStorageRepository implements Repository {
  async load(): Promise<AppData> {
    await wait(250);
    const seeded = rawItem(KEYS.seeded, LEGACY.seeded) === "1";
    if (!seeded) return this.reset();
    return {
      words: read<Word[]>(KEYS.words, LEGACY.words) ?? [],
      sentences: read<Sentence[]>(KEYS.sentences, LEGACY.sentences) ?? [],
      songs: read<Song[]>(KEYS.songs, LEGACY.songs) ?? [],
      decks: read<Deck[]>(KEYS.decks) ?? [],
      profile: read<Profile>(KEYS.profile, LEGACY.profile) ?? { ...defaultProfile },
    };
  }

  async saveWords(words: Word[]) {
    write(KEYS.words, words);
  }
  async saveSentences(sentences: Sentence[]) {
    write(KEYS.sentences, sentences);
  }
  async saveSongs(songs: Song[]) {
    write(KEYS.songs, songs);
  }
  async saveDecks(decks: Deck[]) {
    write(KEYS.decks, decks);
  }
  async saveProfile(profile: Profile) {
    write(KEYS.profile, profile);
  }

  async reset(): Promise<AppData> {
    const data = buildDemoData();
    write(KEYS.words, data.words);
    write(KEYS.sentences, data.sentences);
    write(KEYS.songs, data.songs);
    write(KEYS.decks, data.decks);
    write(KEYS.profile, data.profile);
    window.localStorage.setItem(KEYS.seeded, "1");
    return data;
  }

  getTheme(): ThemeMode | null {
    const theme = rawItem(KEYS.theme, LEGACY.theme);
    return theme === "dark" || theme === "light" ? theme : null;
  }
  setTheme(mode: ThemeMode) {
    window.localStorage.setItem(KEYS.theme, mode);
  }
  getLocale(): Locale {
    return rawItem(KEYS.locale) === "en" ? "en" : "pt";
  }
  setLocale(locale: Locale) {
    window.localStorage.setItem(KEYS.locale, locale);
  }
}

export const repository: Repository = new LocalStorageRepository();

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}
