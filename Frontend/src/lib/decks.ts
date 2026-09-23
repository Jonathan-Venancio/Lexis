import { ALL_DECK_ID, type Deck, type Word } from "@/types";

/** Words that belong to a deck, in deck order. The built-in deck is every word. */
export function wordsInDeck(deckId: string, decks: Deck[], words: Word[]): Word[] {
  if (deckId === ALL_DECK_ID) return words;
  const deck = decks.find((item) => item.id === deckId);
  if (!deck) return [];
  const byId = new Map(words.map((word) => [word.id, word]));
  return deck.wordIds.flatMap((id) => {
    const word = byId.get(id);
    return word ? [word] : [];
  });
}
