import { GameState, Round } from './types';

/** Always start with the player after the dealer. */
export function getBettingStartIndex(round: Round, players: number): number {
  return (round.dealer + 1) % players;
}

export function getLastBettingPlayerIndex(round: Round, players: number): number {
  const startIndex = getBettingStartIndex(round, players);
  return (startIndex + players - 1) % players;
}

export function findNextBettingPlayer(round: Round, players: number): number {
  const startIndex = getBettingStartIndex(round, players);
  for (let i = 0; i < players; i++) {
    const playerIndex = (startIndex + i) % players;
    if (round.bets[playerIndex] === -1) {
      return playerIndex;
    }
  }
  return -1;
}

export function isLastBettingPlayer(
  round: Round,
  players: number,
  playerIndex: number
): boolean {
  return playerIndex === getLastBettingPlayerIndex(round, players);
}

/** Valid bet options for a player; last bettor cannot make total bets equal cards. */
export function getValidBetNumbers(
  round: Round,
  players: number,
  playerIndex: number
): number[] {
  const all = Array.from({ length: round.number + 1 }, (_, i) => i);
  if (!isLastBettingPlayer(round, players, playerIndex)) {
    return all;
  }
  const currentTotal = round.bets.reduce(
    (sum, b, i) => (i === playerIndex ? sum : sum + (b === -1 ? 0 : b)),
    0
  );
  const forbiddenNumber = round.number - currentTotal;
  return all.filter((num) => num !== forbiddenNumber);
}

/**
 * Whose turn it is during the betting phase (before bets confirmed).
 * Walks betting order and returns true only for the first player without a bet
 * when checking that player; otherwise false.
 */
export function isBettingTurn(
  round: Round,
  players: number,
  playerIndex: number
): boolean {
  const startIndex = getBettingStartIndex(round, players);
  for (let i = 0; i < players; i++) {
    const currentPlayerIndex = (startIndex + i) % players;
    if (round.bets[currentPlayerIndex] === -1 || currentPlayerIndex === playerIndex) {
      return currentPlayerIndex === playerIndex;
    }
  }
  return false;
}

export function areAllBetsEntered(round: Round): boolean {
  return round.bets.every((bet) => bet !== -1);
}

/** All bets entered and total bets must not equal the round card count. */
export function areBetsValid(round: Round): boolean {
  if (!areAllBetsEntered(round)) return false;
  const totalBets = round.bets.reduce((sum, bet) => sum + bet, 0);
  return totalBets !== round.number;
}

export function getValidHandNumbers(round: Round, playerIndex: number): number[] {
  const assignedHands = round.hands.reduce(
    (sum, h, i) => (i === playerIndex ? sum : sum + (h === -1 ? 0 : h)),
    0
  );
  const remainingHands = round.number - assignedHands;
  const unassignedPlayers = round.hands.filter(
    (h, i) => h === -1 && i !== playerIndex
  ).length;
  if (unassignedPlayers === 0) {
    return [remainingHands];
  }
  return Array.from({ length: remainingHands + 1 }, (_, i) => i);
}

export function isLastHandsInput(round: Round): boolean {
  return round.hands.filter((h) => h === -1).length === 1;
}

export function calculateRoundScores(round: Round): number[] {
  return round.hands.map((hands, i) =>
    hands === round.bets[i] ? 10 + hands : hands
  );
}

export function calculateTotalScore(
  gameState: GameState,
  playerIndex: number
): number {
  return gameState.rounds.reduce(
    (sum, round) => sum + (round.scores[playerIndex] || 0),
    0
  );
}

/** Highest total among players; -1 if no scores yet meaningfully (all zero stays 0). */
export function getHighestScore(gameState: GameState): number {
  let maxScore = -1;
  for (let i = 0; i < gameState.players; i++) {
    maxScore = Math.max(maxScore, calculateTotalScore(gameState, i));
  }
  return maxScore;
}

/** Leader styling only when someone has scored points. */
export function isLeadingPlayer(
  gameState: GameState,
  playerIndex: number
): boolean {
  const score = calculateTotalScore(gameState, playerIndex);
  return score > 0 && score === getHighestScore(gameState);
}

export function getStreakAt(
  gameState: GameState,
  playerIndex: number,
  roundIndex: number
): number {
  let streak = 0;
  for (let i = roundIndex; i >= 0; i--) {
    const r = gameState.rounds[i];
    if (!r.isComplete) break;
    if (r.hands[playerIndex] === r.bets[playerIndex]) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/** Infer that cards were dealt if any bet has already been entered. */
export function inferCardsDealtReady(round: Round | undefined): boolean {
  if (!round || round.isComplete) return false;
  return round.bets.some((bet) => bet !== -1);
}

/**
 * On cancel bets confirmation with all bets filled: clear the last bettor's bet
 * and return their index so they can re-edit.
 */
export function cancelBetsEditTarget(
  round: Round,
  players: number
): { playerIndex: number; bets: number[] } {
  const lastIndex = getLastBettingPlayerIndex(round, players);
  const bets = [...round.bets];
  bets[lastIndex] = -1;
  return { playerIndex: lastIndex, bets };
}

export function findFirstIncompleteRoundIndex(gameState: GameState): number {
  const idx = gameState.rounds.findIndex((round) => !round.isComplete);
  return idx >= 0 ? idx : gameState.rounds.length - 1;
}
