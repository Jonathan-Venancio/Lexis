import type { Word, WordStatus, PartOfSpeech } from "@/types";

const DAY = 24 * 60 * 60 * 1000;

function daysAgo(n: number, hour = 9): string {
  const d = new Date(Date.now() - n * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function daysFromNow(n: number): string {
  return new Date(Date.now() + n * DAY).toISOString();
}

interface Seed {
  term: string;
  translation: string;
  definition: string;
  example: string;
  pos: PartOfSpeech;
  status: WordStatus;
  addedDaysAgo: number;
  /** negative = overdue (due today), positive = in the future */
  nextInDays: number;
  interval: number;
  reviews: number;
  successes: number;
  notes?: string;
}

const seeds: Seed[] = [
  // ---- Added today (7 words) ----
  { term: "achieve", translation: "alcançar / conseguir", definition: "to succeed in doing something after making an effort", example: "She worked hard to achieve her goals.", pos: "verb", status: "new", addedDaysAgo: 0, nextInDays: -0.1, interval: 0, reviews: 0, successes: 0 },
  { term: "although", translation: "embora / apesar de", definition: "used to introduce a statement that contrasts with the main statement", example: "Although it was raining, we went for a walk.", pos: "conjunction", status: "new", addedDaysAgo: 0, nextInDays: -0.1, interval: 0, reviews: 0, successes: 0 },
  { term: "aware", translation: "ciente / consciente", definition: "knowing that something exists or is happening", example: "I was not aware of the problem.", pos: "adjective", status: "learning", addedDaysAgo: 0, nextInDays: -0.05, interval: 0, reviews: 1, successes: 0 },
  { term: "challenge", translation: "desafio", definition: "something difficult that tests your ability", example: "Learning a new language is a real challenge.", pos: "noun", status: "new", addedDaysAgo: 0, nextInDays: -0.1, interval: 0, reviews: 0, successes: 0 },
  { term: "improve", translation: "melhorar", definition: "to become better or to make something better", example: "I want to improve my English every day.", pos: "verb", status: "learning", addedDaysAgo: 0, nextInDays: -0.05, interval: 0, reviews: 1, successes: 1 },
  { term: "likely", translation: "provável / provavelmente", definition: "probably going to happen or be true", example: "It is likely to rain tomorrow.", pos: "adverb", status: "new", addedDaysAgo: 0, nextInDays: -0.1, interval: 0, reviews: 0, successes: 0 },
  { term: "purpose", translation: "propósito / objetivo", definition: "the reason why something is done or exists", example: "The purpose of this app is to help me learn.", pos: "noun", status: "new", addedDaysAgo: 0, nextInDays: -0.1, interval: 0, reviews: 0, successes: 0 },

  // ---- Due today (5 more, total 12 due) ----
  { term: "apple", translation: "maçã", definition: "a round fruit with red, green or yellow skin", example: "I eat an apple every morning.", pos: "noun", status: "learning", addedDaysAgo: 1, nextInDays: -0.3, interval: 1, reviews: 8, successes: 7, notes: "Also used in 'apple pie'." },
  { term: "red", translation: "vermelho", definition: "the color of blood or fire", example: "She was wearing a red dress.", pos: "adjective", status: "review", addedDaysAgo: 3, nextInDays: -1, interval: 3, reviews: 5, successes: 4 },
  { term: "car", translation: "carro", definition: "a road vehicle with four wheels and an engine", example: "My car is parked outside.", pos: "noun", status: "review", addedDaysAgo: 5, nextInDays: -0.5, interval: 3, reviews: 6, successes: 5 },
  { term: "journey", translation: "jornada / viagem", definition: "the act of travelling from one place to another", example: "The journey took three hours.", pos: "noun", status: "review", addedDaysAgo: 9, nextInDays: -2, interval: 7, reviews: 7, successes: 6 },
  { term: "believe", translation: "acreditar", definition: "to think that something is true or possible", example: "I believe you can do it.", pos: "verb", status: "learning", addedDaysAgo: 2, nextInDays: -0.2, interval: 1, reviews: 3, successes: 2 },

  // ---- Upcoming ----
  { term: "love", translation: "amar / amor", definition: "to have a strong feeling of affection for someone or something", example: "I love learning new words.", pos: "verb", status: "mastered", addedDaysAgo: 40, nextInDays: 25, interval: 60, reviews: 14, successes: 14 },
  { term: "wonder", translation: "imaginar / perguntar-se", definition: "to want to know something; to feel curiosity", example: "I wonder what she is thinking.", pos: "verb", status: "review", addedDaysAgo: 12, nextInDays: 2, interval: 7, reviews: 6, successes: 5 },
  { term: "through", translation: "através de", definition: "from one side of something to the other", example: "We walked through the park.", pos: "preposition", status: "review", addedDaysAgo: 15, nextInDays: 4, interval: 14, reviews: 8, successes: 7 },
  { term: "enough", translation: "suficiente / o bastante", definition: "as much as is needed", example: "There is enough food for everyone.", pos: "adverb", status: "mastered", addedDaysAgo: 34, nextInDays: 12, interval: 30, reviews: 11, successes: 10 },
  { term: "instead", translation: "em vez disso", definition: "in place of someone or something else", example: "Let's stay home instead.", pos: "adverb", status: "review", addedDaysAgo: 8, nextInDays: 1, interval: 7, reviews: 5, successes: 4 },
  { term: "perhaps", translation: "talvez", definition: "used to say that something is possible", example: "Perhaps we will meet again.", pos: "adverb", status: "learning", addedDaysAgo: 2, nextInDays: 0.5, interval: 1, reviews: 2, successes: 1 },
  { term: "choice", translation: "escolha", definition: "the act of choosing between two or more possibilities", example: "It was a difficult choice.", pos: "noun", status: "review", addedDaysAgo: 11, nextInDays: 3, interval: 7, reviews: 6, successes: 5 },
  { term: "quiet", translation: "quieto / silencioso", definition: "making very little noise", example: "The library is a quiet place.", pos: "adjective", status: "mastered", addedDaysAgo: 45, nextInDays: 30, interval: 60, reviews: 12, successes: 12 },
  { term: "remember", translation: "lembrar", definition: "to keep something in your memory", example: "Remember to lock the door.", pos: "verb", status: "mastered", addedDaysAgo: 38, nextInDays: 18, interval: 30, reviews: 10, successes: 9 },
  { term: "discover", translation: "descobrir", definition: "to find something for the first time", example: "Scientists discover new species every year.", pos: "verb", status: "learning", addedDaysAgo: 1, nextInDays: 0.8, interval: 1, reviews: 2, successes: 2 },
  { term: "change", translation: "mudar / mudança", definition: "to become different or to make something different", example: "People can change if they want to.", pos: "verb", status: "review", addedDaysAgo: 14, nextInDays: 6, interval: 14, reviews: 7, successes: 6 },
  { term: "future", translation: "futuro", definition: "the time that will come after the present", example: "Nobody knows what the future holds.", pos: "noun", status: "mastered", addedDaysAgo: 50, nextInDays: 40, interval: 60, reviews: 15, successes: 15 },
  { term: "learn", translation: "aprender", definition: "to get knowledge or skill by studying or practising", example: "I learn ten new words every day.", pos: "verb", status: "mastered", addedDaysAgo: 60, nextInDays: 35, interval: 60, reviews: 16, successes: 16 },
];

export const mockWords: Word[] = seeds.map((s, i) => ({
  id: `w_${i + 1}`,
  term: s.term,
  translation: s.translation,
  definition: s.definition,
  example: s.example,
  notes: s.notes,
  partOfSpeech: s.pos,
  status: s.status,
  createdAt: daysAgo(s.addedDaysAgo, 9 + (i % 8)),
  difficulty: s.status === "mastered" ? 1 : s.status === "new" ? 3 : 2,
  reviewCount: s.reviews,
  successCount: s.successes,
  lastReviewedAt: s.reviews > 0 ? daysAgo(Math.max(0, s.addedDaysAgo - 1)) : null,
  nextReviewAt: daysFromNow(s.nextInDays),
  intervalDays: s.interval,
}));
