import { Suit, GameState } from './types';
import {
  STORAGE_KEY,
  loadGameState,
  saveGameState,
  clearGameState,
  setupFieldsFromGame,
} from './storage';

const sampleGame: GameState = {
  players: 3,
  playerNames: ['Ada', 'Bea', 'Cal'],
  currentRound: 1,
  rounds: [
    {
      number: 7,
      suit: Suit.HEARTS,
      bets: [1, 2, 0],
      hands: [-1, -1, -1],
      scores: [0, 0, 0],
      dealer: 2,
      isComplete: false,
    },
  ],
};

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when empty', () => {
    expect(loadGameState()).toBeNull();
  });

  it('round-trips a valid game', () => {
    saveGameState(sampleGame, 0);
    const loaded = loadGameState();
    expect(loaded).toEqual({ ...sampleGame, currentRound: 0 });
  });

  it('clears corrupt JSON and returns null (P1.2)', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json');
    expect(loadGameState()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('clears invalid shape and returns null', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 1 }));
    expect(loadGameState()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('clearGameState removes the key', () => {
    saveGameState(sampleGame, 0);
    clearGameState();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('setupFieldsFromGame restores player/round counts (P1.3)', () => {
    expect(setupFieldsFromGame(sampleGame)).toEqual({
      playerCount: '3',
      roundCount: '7',
      playerNames: ['Ada', 'Bea', 'Cal'],
    });
  });
});
