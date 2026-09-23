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
  Profile,
  ReviewGrade,
  Deck,
  Sentence,
  SentenceInput,
  Song,
  SongInput,
  ThemeMode,
  Word,
  WordInput,
} from "@/types";
import { ALL_DECK_ID } from "@/types";
import { repository, newId, defaultProfile } from "@/services/repository";
import { normalizeWord } from "@/lib/text";
import { applyGrade } from "@/lib/srs";

export type AddWordResult = { ok: true; word: Word } | { ok: false; existing: Word };

interface AppDataContextValue extends AppData {
  ready: boolean;
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;

  findDuplicate: (term: string, ignoreId?: string) => Word | undefined;
  addWord: (input: WordInput, deckId?: string) => AddWordResult;
  updateWord: (id: string, input: Partial<WordInput>) => AddWordResult | { ok: true };
  deleteWord: (id: string) => void;
  gradeWord: (id: string, grade: ReviewGrade) => Word | undefined;

  createDeck: (name: string, wordIds: string[]) => Deck;
  deleteDeck: (id: string) => void;
  addWordsToDeck: (deckId: string, wordIds: string[]) => void;
  removeWordFromDeck: (deckId: string, wordId: string) => void;

  addSentence: (input: SentenceInput) => Sentence;
  updateSentence: (id: string, input: Partial<SentenceInput>) => void;
  deleteSentence: (id: string) => void;

  addSong: (input: SongInput) => Song;
  updateSong: (id: string, input: Partial<SongInput>) => void;
  deleteSong: (id: string) => void;

  updateProfile: (input: Partial<Profile>) => void;
  resetDemoData: () => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [words, setWords] = useState<Word[]>([]);
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [theme, setThemeState] = useState<ThemeMode>("light");

  // Initial load (client only)
  useEffect(() => {
    let cancelled = false;
    const stored = repository.getTheme();
    const prefersDark =
      typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme: ThemeMode = stored ?? (prefersDark ? "dark" : "light");
    setThemeState(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");

    repository.load().then((data) => {
      if (cancelled) return;
      setWords(data.words);
      setSentences(data.sentences);
      setSongs(data.songs);
      setDecks(data.decks);
      setProfile(data.profile);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    repository.setTheme(mode);
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, []);
  const toggleTheme = useCallback(
    () => setTheme(theme === "dark" ? "light" : "dark"),
    [theme, setTheme],
  );

  // Persist helpers — update state and mirror to the repository
  const commitWords = useCallback((next: Word[]) => {
    setWords(next);
    void repository.saveWords(next);
  }, []);
  const commitSentences = useCallback((next: Sentence[]) => {
    setSentences(next);
    void repository.saveSentences(next);
  }, []);
  const commitSongs = useCallback((next: Song[]) => {
    setSongs(next);
    void repository.saveSongs(next);
  }, []);
  const commitDecks = useCallback((next: Deck[]) => {
    setDecks(next);
    void repository.saveDecks(next);
  }, []);

  // ---- Words ----
  const findDuplicate = useCallback(
    (term: string, ignoreId?: string) => {
      const key = normalizeWord(term);
      return words.find((w) => w.id !== ignoreId && normalizeWord(w.term) === key);
    },
    [words],
  );

  const addWord = useCallback(
    (input: WordInput, deckId?: string): AddWordResult => {
      const existing = findDuplicate(input.term);
      if (existing) return { ok: false, existing };
      const now = new Date().toISOString();
      const word: Word = {
        id: newId("w"),
        term: input.term.trim(),
        translation: input.translation.trim(),
        definition: input.definition.trim(),
        example: input.example.trim(),
        notes: input.notes?.trim() || undefined,
        partOfSpeech: input.partOfSpeech,
        status: "new",
        createdAt: now,
        difficulty: 3,
        reviewCount: 0,
        successCount: 0,
        lastReviewedAt: null,
        nextReviewAt: now,
        intervalDays: 0,
      };
      commitWords([word, ...words]);
      if (deckId && deckId !== ALL_DECK_ID) {
        commitDecks(
          decks.map((deck) =>
            deck.id === deckId ? { ...deck, wordIds: [...new Set([...deck.wordIds, word.id])] } : deck,
          ),
        );
      }
      return { ok: true, word };
    },
    [words, decks, findDuplicate, commitWords, commitDecks],
  );

  const updateWord = useCallback(
    (id: string, input: Partial<WordInput>) => {
      if (input.term !== undefined) {
        const existing = findDuplicate(input.term, id);
        if (existing) return { ok: false as const, existing };
      }
      commitWords(
        words.map((w) =>
          w.id === id
            ? {
                ...w,
                ...input,
                term: input.term?.trim() ?? w.term,
                notes: input.notes !== undefined ? input.notes.trim() || undefined : w.notes,
              }
            : w,
        ),
      );
      return { ok: true as const };
    },
    [words, findDuplicate, commitWords],
  );

  const deleteWord = useCallback(
    (id: string) => {
      commitWords(words.filter((w) => w.id !== id));
      const nextDecks = decks.map((deck) =>
        deck.wordIds.includes(id) ? { ...deck, wordIds: deck.wordIds.filter((wordId) => wordId !== id) } : deck,
      );
      if (nextDecks.some((deck, index) => deck !== decks[index])) commitDecks(nextDecks);
    },
    [words, decks, commitWords, commitDecks],
  );

  const gradeWord = useCallback(
    (id: string, grade: ReviewGrade) => {
      let updated: Word | undefined;
      const next = words.map((w) => {
        if (w.id !== id) return w;
        updated = applyGrade(w, grade);
        return updated;
      });
      commitWords(next);
      return updated;
    },
    [words, commitWords],
  );

  // ---- Decks ----
  const createDeck = useCallback(
    (name: string, wordIds: string[]) => {
      const known = new Set(words.map((word) => word.id));
      const deck: Deck = {
        id: newId("deck"),
        name: name.trim(),
        wordIds: [...new Set(wordIds.filter((id) => known.has(id)))],
        createdAt: new Date().toISOString(),
      };
      commitDecks([deck, ...decks]);
      return deck;
    },
    [words, decks, commitDecks],
  );

  const deleteDeck = useCallback(
    (id: string) => commitDecks(decks.filter((deck) => deck.id !== id)),
    [decks, commitDecks],
  );

  const addWordsToDeck = useCallback(
    (deckId: string, wordIds: string[]) => {
      const known = new Set(words.map((word) => word.id));
      commitDecks(
        decks.map((deck) => {
          if (deck.id !== deckId) return deck;
          const ids = new Set(deck.wordIds);
          for (const wordId of wordIds) {
            if (known.has(wordId)) ids.add(wordId);
          }
          return { ...deck, wordIds: [...ids] };
        }),
      );
    },
    [words, decks, commitDecks],
  );

  const removeWordFromDeck = useCallback(
    (deckId: string, wordId: string) =>
      commitDecks(
        decks.map((deck) =>
          deck.id === deckId ? { ...deck, wordIds: deck.wordIds.filter((id) => id !== wordId) } : deck,
        ),
      ),
    [decks, commitDecks],
  );

  // ---- Sentences ----
  const addSentence = useCallback(
    (input: SentenceInput) => {
      const sentence: Sentence = {
        id: newId("s"),
        text: input.text.trim(),
        translation: input.translation?.trim() || undefined,
        notes: input.notes?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };
      commitSentences([sentence, ...sentences]);
      return sentence;
    },
    [sentences, commitSentences],
  );
  const updateSentence = useCallback(
    (id: string, input: Partial<SentenceInput>) =>
      commitSentences(
        sentences.map((s) =>
          s.id === id
            ? {
                ...s,
                text: input.text?.trim() ?? s.text,
                translation:
                  input.translation !== undefined ? input.translation.trim() || undefined : s.translation,
                notes: input.notes !== undefined ? input.notes.trim() || undefined : s.notes,
              }
            : s,
        ),
      ),
    [sentences, commitSentences],
  );
  const deleteSentence = useCallback(
    (id: string) => commitSentences(sentences.filter((s) => s.id !== id)),
    [sentences, commitSentences],
  );

  // ---- Songs ----
  const addSong = useCallback(
    (input: SongInput) => {
      const now = new Date().toISOString();
      const song: Song = {
        id: newId("song"),
        title: input.title.trim(),
        artist: input.artist.trim(),
        album: input.album?.trim() || undefined,
        url: input.url?.trim() || undefined,
        lyrics: input.lyrics,
        myTranslation: input.myTranslation,
        referenceTranslation: input.referenceTranslation,
        createdAt: now,
        updatedAt: now,
      };
      commitSongs([song, ...songs]);
      return song;
    },
    [songs, commitSongs],
  );
  const updateSong = useCallback(
    (id: string, input: Partial<SongInput>) =>
      commitSongs(
        songs.map((s) =>
          s.id === id ? { ...s, ...input, updatedAt: new Date().toISOString() } : s,
        ),
      ),
    [songs, commitSongs],
  );
  const deleteSong = useCallback(
    (id: string) => commitSongs(songs.filter((s) => s.id !== id)),
    [songs, commitSongs],
  );

  // ---- Profile / reset ----
  const updateProfile = useCallback(
    (input: Partial<Profile>) => {
      const next = { ...profile, ...input };
      setProfile(next);
      void repository.saveProfile(next);
    },
    [profile],
  );

  const resetDemoData = useCallback(async () => {
    const data = await repository.reset();
    setWords(data.words);
    setSentences(data.sentences);
    setSongs(data.songs);
    setDecks(data.decks);
    setProfile(data.profile);
  }, []);

  const value = useMemo<AppDataContextValue>(
    () => ({
      ready,
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
      resetDemoData,
    }),
    [
      ready, words, sentences, songs, decks, profile, theme, toggleTheme, setTheme,
      findDuplicate, addWord, updateWord, deleteWord, gradeWord,
      createDeck, deleteDeck, addWordsToDeck, removeWordFromDeck,
      addSentence, updateSentence, deleteSentence, addSong, updateSong, deleteSong,
      updateProfile, resetDemoData,
    ],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
