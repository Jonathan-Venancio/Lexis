import type { Deck, Profile, Sentence, SentenceInput, Song, SongInput, Word, WordInput } from "@/types";

const base = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, body: unknown) {
    super(`API ${status}`);
    this.status = status;
    this.body = body;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, body);
  return body as T;
}

function optionalText(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function mapWord(raw: Word): Word {
  return {
    ...raw,
    notes: optionalText(raw.notes),
    lastGrade: raw.lastGrade ?? null,
    partOfSpeech: raw.partOfSpeech || undefined,
    definition: raw.definition ?? "",
    example: raw.example ?? "",
  };
}

function mapSentence(raw: Sentence): Sentence {
  return { ...raw, translation: optionalText(raw.translation), notes: optionalText(raw.notes) };
}

function mapSong(raw: Song): Song {
  return {
    ...raw,
    album: optionalText(raw.album),
    url: optionalText(raw.url),
    lyrics: raw.lyrics ?? "",
    myTranslation: raw.myTranslation ?? "",
    referenceTranslation: raw.referenceTranslation ?? "",
  };
}

function mapDeck(raw: Deck): Deck {
  return { ...raw, wordIds: raw.wordIds ?? [] };
}

export interface Bootstrap {
  words: Word[];
  sentences: Sentence[];
  songs: Song[];
  decks: Deck[];
  profile: Profile;
}

export const api = {
  async bootstrap(): Promise<Bootstrap> {
    const data = await request<Bootstrap>("/api/bootstrap");
    return {
      words: data.words.map(mapWord),
      sentences: data.sentences.map(mapSentence),
      songs: data.songs.map(mapSong),
      decks: data.decks.map(mapDeck),
      profile: data.profile,
    };
  },

  async createWord(input: WordInput, deckId?: string): Promise<Word> {
    const query = deckId ? `?deckId=${encodeURIComponent(deckId)}` : "";
    return mapWord(await request<Word>(`/api/words${query}`, { method: "POST", body: JSON.stringify(input) }));
  },

  async updateWord(id: string, input: Partial<WordInput>): Promise<Word> {
    return mapWord(await request<Word>(`/api/words/${id}`, { method: "PATCH", body: JSON.stringify(input) }));
  },

  deleteWord(id: string) {
    return request<void>(`/api/words/${id}`, { method: "DELETE" });
  },

  async gradeWord(id: string, grade: string): Promise<Word> {
    return mapWord(await request<Word>(`/api/words/${id}/grade`, { method: "POST", body: JSON.stringify({ grade }) }));
  },

  async createSentence(input: SentenceInput): Promise<Sentence> {
    return mapSentence(await request<Sentence>("/api/sentences", { method: "POST", body: JSON.stringify(input) }));
  },

  async updateSentence(id: string, input: Partial<SentenceInput>): Promise<Sentence> {
    return mapSentence(await request<Sentence>(`/api/sentences/${id}`, { method: "PATCH", body: JSON.stringify(input) }));
  },

  deleteSentence(id: string) {
    return request<void>(`/api/sentences/${id}`, { method: "DELETE" });
  },

  async createSong(input: SongInput): Promise<Song> {
    return mapSong(await request<Song>("/api/songs", { method: "POST", body: JSON.stringify(input) }));
  },

  async updateSong(id: string, input: Partial<SongInput>): Promise<Song> {
    return mapSong(await request<Song>(`/api/songs/${id}`, { method: "PATCH", body: JSON.stringify(input) }));
  },

  deleteSong(id: string) {
    return request<void>(`/api/songs/${id}`, { method: "DELETE" });
  },

  async createDeck(name: string, wordIds: string[]): Promise<Deck> {
    return mapDeck(await request<Deck>("/api/decks", { method: "POST", body: JSON.stringify({ name, wordIds }) }));
  },

  deleteDeck(id: string) {
    return request<void>(`/api/decks/${id}`, { method: "DELETE" });
  },

  async addWordsToDeck(deckId: string, wordIds: string[]): Promise<Deck> {
    return mapDeck(
      await request<Deck>(`/api/decks/${deckId}/words`, { method: "POST", body: JSON.stringify({ wordIds }) }),
    );
  },

  async removeWordFromDeck(deckId: string, wordId: string): Promise<Deck> {
    return mapDeck(await request<Deck>(`/api/decks/${deckId}/words/${wordId}`, { method: "DELETE" }));
  },

  updateProfile(input: Partial<Profile>) {
    return request<Profile>("/api/profile", { method: "PATCH", body: JSON.stringify(input) });
  },
};

export function duplicateFrom(error: unknown): Word | undefined {
  if (!(error instanceof ApiError) || error.status !== 409) return undefined;
  const detail = (error.body as { detail?: { word?: Word } } | null)?.detail;
  return detail?.word ? mapWord(detail.word) : undefined;
}
