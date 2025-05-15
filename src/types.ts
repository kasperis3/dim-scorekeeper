export enum Suit {
  SPADES = "♠️",
  HEARTS = "♥️",
  DIAMONDS = "♦️",
  CLUBS = "♣️",
  NO_TRUMP = "NT"
}

export interface Round {
  number: number;
  suit: Suit;
  bets: number[];
  hands: number[];
  scores: number[];
  dealer: number;
  isComplete: boolean;
}

export interface GameState {
  players: number;
  playerNames: string[];
  currentRound: number;
  rounds: Round[];
} 