import type { Sentence } from "@/types";

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

const seeds: Array<{ text: string; translation?: string; notes?: string; days: number }> = [
  { text: "The apple is red.", translation: "A maçã é vermelha.", days: 0 },
  { text: "I love apple pie.", translation: "Eu amo torta de maçã.", days: 0 },
  { text: "The car is red.", translation: "O carro é vermelho.", days: 1 },
  { text: "She bought an apple at the supermarket.", translation: "Ela comprou uma maçã no supermercado.", days: 1 },
  { text: "I believe things can change.", translation: "Eu acredito que as coisas podem mudar.", days: 2 },
  { text: "This journey will be a challenge.", translation: "Esta jornada será um desafio.", days: 2 },
  { text: "Perhaps we will discover something new.", translation: "Talvez descubramos algo novo.", days: 3 },
  { text: "She worked hard to achieve her goals.", translation: "Ela trabalhou duro para alcançar seus objetivos.", days: 0 },
  { text: "Although I was tired, I kept going.", translation: "Embora eu estivesse cansado, continuei.", days: 0 },
  { text: "I want to improve my English every day.", translation: "Quero melhorar meu inglês todos os dias.", days: 0 },
  { text: "It is likely to rain tomorrow.", translation: "É provável que chova amanhã.", days: 4 },
  { text: "What is the purpose of this meeting?", translation: "Qual é o propósito desta reunião?", days: 4 },
  { text: "I wonder if she will remember me.", translation: "Eu me pergunto se ela vai se lembrar de mim.", days: 5 },
  { text: "We walked through the quiet streets.", translation: "Caminhamos pelas ruas silenciosas.", days: 6 },
  { text: "That is enough for today.", translation: "Isso é o suficiente por hoje.", days: 6 },
  { text: "Let's take the bus instead of the car.", translation: "Vamos de ônibus em vez de carro.", days: 7 },
  { text: "It was a difficult choice, but I made it.", translation: "Foi uma escolha difícil, mas eu a fiz.", days: 8 },
  { text: "The future belongs to those who learn.", translation: "O futuro pertence àqueles que aprendem.", days: 9, notes: "Nice motivational line." },
  { text: "Be aware of the small changes around you.", translation: "Esteja ciente das pequenas mudanças ao seu redor.", days: 10 },
  { text: "I love a quiet morning with a red apple.", translation: "Eu amo uma manhã silenciosa com uma maçã vermelha.", days: 11 },
];

export const mockSentences: Sentence[] = seeds.map((s, i) => ({
  id: `s_${i + 1}`,
  text: s.text,
  translation: s.translation,
  notes: s.notes,
  createdAt: daysAgo(s.days),
}));
