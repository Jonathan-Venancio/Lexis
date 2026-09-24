export type WordStatus = "new" | "learning" | "review" | "mastered";

export type PartOfSpeech =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "conjunction"
  | "preposition"
  | "pronoun"
  | "other";

export interface Word {
  id: string;
  term: string;
  translation: string;
  definition: string;
  example: string;
  notes?: string;
  partOfSpeech?: PartOfSpeech;
  status: WordStatus;
  /** Last review button the user pressed. Empty until the word is reviewed. */
  lastGrade: ReviewGrade | null;
  createdAt: string; // ISO
  // Spaced repetition state
  difficulty: number; // 1 (easy) .. 5 (hard)
  reviewCount: number;
  successCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string; // ISO
  intervalDays: number;
}

export type WordInput = Pick<
  Word,
  "term" | "translation" | "definition" | "example" | "notes" | "partOfSpeech"
>;

export interface Sentence {
  id: string;
  text: string;
  translation?: string;
  notes?: string;
  createdAt: string;
}

export type SentenceInput = Pick<Sentence, "text" | "translation" | "notes">;

export interface Song {
  id: string;
  title: string;
  artist: string;
  album?: string;
  url?: string;
  lyrics: string;
  myTranslation: string;
  referenceTranslation: string;
  createdAt: string;
  updatedAt: string;
}

export type SongInput = Pick<
  Song,
  "title" | "artist" | "album" | "url" | "lyrics" | "myTranslation" | "referenceTranslation"
>;

export type ReviewGrade = "again" | "hard" | "good" | "easy";

export interface ReviewCard {
  wordId: string;
  word: Word;
}

export interface ReviewSession {
  startedAt: string;
  cards: ReviewCard[];
  index: number;
  results: Record<ReviewGrade, number>;
  finished: boolean;
}

/** Built-in deck that always contains every saved word. It is not stored. */
export const ALL_DECK_ID = "all";

export interface Deck {
  id: string;
  name: string;
  wordIds: string[];
  createdAt: string;
}

export interface Profile {
  name: string;
  email: string;
  dailyGoal: number;
  streakDays: number;
}

export type ThemeMode = "light" | "dark";

export interface AppData {
  words: Word[];
  sentences: Sentence[];
  songs: Song[];
  decks: Deck[];
  profile: Profile;
}

export type LineMatch = "correct" | "close" | "different" | "missing";
