import { GameState } from './types';

export const STORAGE_KEY = 'cardGameState';

function isValidGameState(value: unknown): value is GameState {
  if (!value || typeof value !== 'object') return false;
  const state = value as GameState;
  return (
    typeof state.players === 'number' &&
    Array.isArray(state.playerNames) &&
    typeof state.currentRound === 'number' &&
    Array.isArray(state.rounds)
  );
}

/** Load game state from localStorage. Clears key and returns null on corrupt data. */
export function loadGameState(): GameState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (!isValidGameState(parsed)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function saveGameState(gameState: GameState, currentRoundIndex: number): void {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...gameState,
      currentRound: currentRoundIndex,
    })
  );
}

export function clearGameState(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Setup fields to restore from a saved game. */
export function setupFieldsFromGame(gameState: GameState): {
  playerCount: string;
  roundCount: string;
  playerNames: string[];
} {
  return {
    playerCount: String(gameState.players),
    roundCount: String(gameState.rounds[0]?.number ?? 10),
    playerNames: [...gameState.playerNames],
  };
}
