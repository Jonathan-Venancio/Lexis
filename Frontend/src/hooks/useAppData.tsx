import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AppData,
  Deck,
  Profile,
  ReviewGrade,
  Sentence,
  SentenceInput,
  Song,
  SongInput,
  ThemeMode,
  Word,
  WordInput,
} from "@/types";
import { ALL_DECK_ID } from "@/types";
import { ApiError, api, duplicateFrom } from "@/services/api";
import { preferences } from "@/services/preferences";
import { normalizeWord } from "@/lib/text";
import { applyGrade } from "@/lib/srs";

export type AddWordResult = { ok: true; word: Word } | { ok: false; existing: Word };

export const defaultProfile: Profile = { name: "", email: "", dailyGoal: 10, streakDays: 0 };

interface AppDataContextValue extends AppData {
  ready: boolean;
  signedIn: boolean;
  loadError: string | null;
  reload: () => void;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;

  findDuplicate: (term: string, ignoreId?: string) => Word | undefined;
  addWord: (input: WordInput, deckId?: string) => Promise<AddWordResult>;
  updateWord: (id: string, input: Partial<WordInput>) => Promise<AddWordResult | { ok: true }>;
  deleteWord: (id: string) => Promise<void>;
  gradeWord: (id: string, grade: ReviewGrade) => void;

  createDeck: (name: string, wordIds: string[]) => Promise<Deck>;
  deleteDeck: (id: string) => Promise<void>;
  addWordsToDeck: (deckId: string, wordIds: string[]) => Promise<void>;
  removeWordFromDeck: (deckId: string, wordId: string) => Promise<void>;

  addSentence: (input: SentenceInput) => Promise<Sentence>;
  updateSentence: (id: string, input: Partial<SentenceInput>) => Promise<void>;
  deleteSentence: (id: string) => Promise<void>;

  addSong: (input: SongInput) => Promise<Song>;
  updateSong: (id: string, input: Partial<SongInput>) => Promise<void>;
  deleteSong: (id: string) => Promise<void>;

  updateProfile: (input: Partial<Profile>) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

function emptyStudyData() {
  return {
    words: [] as Word[],
    sentences: [] as Sentence[],
    songs: [] as Song[],
    decks: [] as Deck[],
    profile: defaultProfile,
  };
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReady(false);
    setLoadError(null);
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const stored = preferences.getTheme();
    const prefersDark =
      typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme: ThemeMode = stored ?? (prefersDark ? "dark" : "light");
    setThemeState(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");

    const token = preferences.getToken();
    if (!token) {
      const empty = emptyStudyData();
      setWords(empty.words);
      setSentences(empty.sentences);
      setSongs(empty.songs);
      setDecks(empty.decks);
      setProfile(empty.profile);
      setSignedIn(false);
      setLoadError(null);
      setReady(true);
      return () => {
        cancelled = true;
      };
    }

    api
      .bootstrap()
      .then((data) => {
        if (cancelled) return;
        setWords(data.words);
        setSentences(data.sentences);
        setSongs(data.songs);
        setDecks(data.decks);
        setProfile(data.profile);
        setSignedIn(true);
        setLoadError(null);
        setReady(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 401) {
          preferences.clearToken();
          const empty = emptyStudyData();
          setWords(empty.words);
          setSentences(empty.sentences);
          setSongs(empty.songs);
          setDecks(empty.decks);
          setProfile(empty.profile);
          setSignedIn(false);
          setLoadError(null);
          setReady(true);
          return;
        }
        setLoadError("offline");
        setReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    preferences.setTheme(mode);
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, []);
  const toggleTheme = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme],
  );

  const findDuplicate = useCallback(
    (term: string, ignoreId?: string) => {
      const key = normalizeWord(term);
      return words.find((word) => word.id !== ignoreId && normalizeWord(word.term) === key);
    },
    [words],
  );

  const addWord = useCallback(
    async (input: WordInput, deckId?: string): Promise<AddWordResult> => {
      const existing = findDuplicate(input.term);
      if (existing) return { ok: false, existing };
      try {
        const word = await api.createWord(input, deckId);
        setWords((current) => [word, ...current]);
        if (deckId && deckId !== ALL_DECK_ID) {
          setDecks((current) =>
            current.map((deck) =>
              deck.id === deckId && !deck.wordIds.includes(word.id)
                ? { ...deck, wordIds: [...deck.wordIds, word.id] }
                : deck,
            ),
          );
        }
        return { ok: true, word };
      } catch (error) {
        const duplicate = duplicateFrom(error);
        if (duplicate) return { ok: false, existing: duplicate };
        throw error;
      }
    },
    [findDuplicate],
  );

  const updateWord = useCallback(async (id: string, input: Partial<WordInput>) => {
    if (input.term !== undefined) {
      const existing = findDuplicate(input.term, id);
      if (existing) return { ok: false as const, existing };
    }
    try {
      const word = await api.updateWord(id, input);
      setWords((current) => current.map((item) => (item.id === id ? word : item)));
      return { ok: true as const };
    } catch (error) {
      const duplicate = duplicateFrom(error);
      if (duplicate) return { ok: false as const, existing: duplicate };
      throw error;
    }
  }, [findDuplicate]);

  const deleteWord = useCallback(async (id: string) => {
    await api.deleteWord(id);
    setWords((current) => current.filter((word) => word.id !== id));
    setDecks((current) =>
      current.map((deck) => ({ ...deck, wordIds: deck.wordIds.filter((wordId) => wordId !== id) })),
    );
  }, []);

  const gradeWord = useCallback((id: string, grade: ReviewGrade) => {
    const word = words.find((item) => item.id === id);
    if (!word) return;
    const optimistic = applyGrade(word, grade);
    setWords((current) => current.map((item) => (item.id === id ? optimistic : item)));
    void api.gradeWord(id, grade).then(
      (saved) => setWords((latest) => latest.map((item) => (item.id === id ? saved : item))),
      () => setWords((latest) => latest.map((item) => (item.id === id ? word : item))),
    );
  }, [words]);

  const createDeck = useCallback(async (name: string, wordIds: string[]) => {
    const deck = await api.createDeck(name, wordIds);
    setDecks((current) => [deck, ...current]);
    return deck;
  }, []);

  const deleteDeck = useCallback(async (id: string) => {
    await api.deleteDeck(id);
    setDecks((current) => current.filter((deck) => deck.id !== id));
  }, []);

  const addWordsToDeck = useCallback(async (deckId: string, wordIds: string[]) => {
    const deck = await api.addWordsToDeck(deckId, wordIds);
    setDecks((current) => current.map((item) => (item.id === deckId ? deck : item)));
  }, []);

  const removeWordFromDeck = useCallback(async (deckId: string, wordId: string) => {
    const deck = await api.removeWordFromDeck(deckId, wordId);
    setDecks((current) => current.map((item) => (item.id === deckId ? deck : item)));
  }, []);

  const addSentence = useCallback(async (input: SentenceInput) => {
    const sentence = await api.createSentence(input);
    setSentences((current) => [sentence, ...current]);
    return sentence;
  }, []);

  const updateSentence = useCallback(async (id: string, input: Partial<SentenceInput>) => {
    const sentence = await api.updateSentence(id, input);
    setSentences((current) => current.map((item) => (item.id === id ? sentence : item)));
  }, []);

  const deleteSentence = useCallback(async (id: string) => {
    await api.deleteSentence(id);
    setSentences((current) => current.filter((item) => item.id !== id));
  }, []);

  const addSong = useCallback(async (input: SongInput) => {
    const song = await api.createSong(input);
    setSongs((current) => [song, ...current]);
    return song;
  }, []);

  const updateSong = useCallback(async (id: string, input: Partial<SongInput>) => {
    const song = await api.updateSong(id, input);
    setSongs((current) => current.map((item) => (item.id === id ? song : item)));
  }, []);

  const deleteSong = useCallback(async (id: string) => {
    await api.deleteSong(id);
    setSongs((current) => current.filter((item) => item.id !== id));
  }, []);

  const updateProfile = useCallback(async (input: Partial<Profile>) => {
    const next = await api.updateProfile(input);
    setProfile(next);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await api.login(email, password);
    preferences.setToken(session.token);
    reload();
  }, [reload]);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const session = await api.register(email, password, name);
    preferences.setToken(session.token);
    reload();
  }, [reload]);

  const logout = useCallback(() => {
    preferences.clearToken();
    const empty = emptyStudyData();
    setWords(empty.words);
    setSentences(empty.sentences);
    setSongs(empty.songs);
    setDecks(empty.decks);
    setProfile(empty.profile);
    setSignedIn(false);
    setLoadError(null);
    setReady(true);
  }, []);

  const value = useMemo<AppDataContextValue>(
    () => ({
      ready,
      signedIn,
      loadError,
      reload,
      login,
      register,
      logout,
      words,
      sentences,
      songs,
      decks,
      profile,
      theme,
      toggleTheme,
      setTheme,
      findDuplicate,
      addWord,
      updateWord,
      deleteWord,
      gradeWord,
      createDeck,
      deleteDeck,
      addWordsToDeck,
      removeWordFromDeck,
      addSentence,
      updateSentence,
      deleteSentence,
      addSong,
      updateSong,
      deleteSong,
      updateProfile,
    }),
    [
      ready, signedIn, loadError, reload, login, register, logout, words, sentences, songs, decks, profile, theme, toggleTheme, setTheme,
      findDuplicate, addWord, updateWord, deleteWord, gradeWord,
      createDeck, deleteDeck, addWordsToDeck, removeWordFromDeck,
      addSentence, updateSentence, deleteSentence, addSong, updateSong, deleteSong,
      updateProfile,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
