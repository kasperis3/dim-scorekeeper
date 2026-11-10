import { Suit, GameState, Round } from './types';
import {
  getBettingStartIndex,
  getLastBettingPlayerIndex,
  findNextBettingPlayer,
  getValidBetNumbers,
  isBettingTurn,
  getValidHandNumbers,
  calculateRoundScores,
  calculateTotalScore,
  getHighestScore,
  isLeadingPlayer,
  getStreakAt,
  inferCardsDealtReady,
  cancelBetsEditTarget,
  areBetsValid,
} from './gameLogic';

function makeRound(partial: Partial<Round> & { number: number; dealer: number }): Round {
  const players = partial.bets?.length ?? 4;
  return {
    suit: Suit.SPADES,
    bets: Array(players).fill(-1),
    hands: Array(players).fill(-1),
    scores: Array(players).fill(0),
    isComplete: false,
    ...partial,
  };
}

describe('betting order', () => {
  it('starts with the player after the dealer', () => {
    // First-round convention: dealer = players - 1 → first bettor = 0
    const round = makeRound({ number: 13, dealer: 3, bets: [-1, -1, -1, -1] });
    expect(getBettingStartIndex(round, 4)).toBe(0);
    expect(getLastBettingPlayerIndex(round, 4)).toBe(3);
  });

  it('uses dealer+1 even when round.number is 10 in a 13-round game (P1.1)', () => {
    // Mid-game: round of 10 cards, dealer is player 1 → start at 2, last is 1
    const round = makeRound({
      number: 10,
      dealer: 1,
      bets: [3, -1, 2, 1],
    });
    expect(getBettingStartIndex(round, 4)).toBe(2);
    expect(getLastBettingPlayerIndex(round, 4)).toBe(1);

    // Last bettor (dealer=1) cannot make total === 10
    // Current total excluding last: 3+2+1 = 6 → forbidden = 4
    const valid = getValidBetNumbers(round, 4, 1);
    expect(valid).not.toContain(4);
    expect(valid).toContain(3);
    expect(valid).toContain(5);
  });

  it('finds the next unset bettor in order', () => {
    const round = makeRound({
      number: 5,
      dealer: 0,
      bets: [-1, 1, -1, 2], // start at 1; 1 already bet → next is 2
    });
    // bets[1]=1, bets[2]=-1 → next is 2
    expect(findNextBettingPlayer(round, 4)).toBe(2);
  });

  it('isBettingTurn advances to the first unset player', () => {
    const round = makeRound({
      number: 5,
      dealer: 3, // start at 0
      bets: [1, -1, -1, -1],
    });
    // Existing App behavior: a player who already bet still matches themselves
    // when reached in order; later unset players are blocked until their turn.
    expect(isBettingTurn(round, 4, 0)).toBe(true);
    expect(isBettingTurn(round, 4, 1)).toBe(true);
    expect(isBettingTurn(round, 4, 2)).toBe(false);
  });
});

describe('hands and scores', () => {
  it('forces the last player to take remaining hands', () => {
    const round = makeRound({
      number: 5,
      dealer: 0,
      bets: [1, 1, 1, 2],
      hands: [2, 1, 1, -1],
    });
    expect(getValidHandNumbers(round, 3)).toEqual([1]);
  });

  it('scores 10 + hands on make, hands alone on bust', () => {
    const round = makeRound({
      number: 5,
      dealer: 0,
      bets: [2, 1, 0, 3],
      hands: [2, 0, 0, 3],
    });
    expect(calculateRoundScores(round)).toEqual([12, 0, 10, 13]);
  });

  it('rejects bets that total exactly the card count', () => {
    const round = makeRound({
      number: 5,
      dealer: 0,
      bets: [2, 1, 1, 1],
    });
    expect(areBetsValid(round)).toBe(false);
  });
});

describe('streaks and leaders', () => {
  function gameWithScores(rounds: Round[]): GameState {
    return {
      players: 2,
      playerNames: ['A', 'B'],
      currentRound: 0,
      rounds,
    };
  }

  it('counts consecutive makes and breaks on bust', () => {
    const rounds = [
      makeRound({
        number: 3,
        dealer: 1,
        bets: [1, 1],
        hands: [1, 0],
        scores: [11, 0],
        isComplete: true,
      }),
      makeRound({
        number: 2,
        dealer: 0,
        bets: [1, 1],
        hands: [1, 1],
        scores: [11, 11],
        isComplete: true,
      }),
      makeRound({
        number: 1,
        dealer: 1,
        bets: [0, 1],
        hands: [0, 1],
        scores: [10, 11],
        isComplete: true,
      }),
    ];
    const state = gameWithScores(rounds);
    // Player 0: made round0, made round1, made round2 → streak 3 at index 2
    expect(getStreakAt(state, 0, 2)).toBe(3);
    // Player 1: busted round0, then made → streak at index 2 is 2
    expect(getStreakAt(state, 1, 2)).toBe(2);
    // At round 0 for player 1: bust → streak 0
    expect(getStreakAt(state, 1, 0)).toBe(0);
  });

  it('does not treat all-zero totals as leaders (P1.7)', () => {
    const state = gameWithScores([
      makeRound({
        number: 3,
        dealer: 1,
        bets: [-1, -1],
        hands: [-1, -1],
        scores: [0, 0],
        isComplete: false,
      }),
    ]);
    expect(getHighestScore(state)).toBe(0);
    expect(isLeadingPlayer(state, 0)).toBe(false);
    expect(isLeadingPlayer(state, 1)).toBe(false);
    expect(calculateTotalScore(state, 0)).toBe(0);
  });

  it('marks the sole positive leader', () => {
    const state = gameWithScores([
      makeRound({
        number: 3,
        dealer: 1,
        bets: [1, 1],
        hands: [1, 0],
        scores: [11, 0],
        isComplete: true,
      }),
    ]);
    expect(isLeadingPlayer(state, 0)).toBe(true);
    expect(isLeadingPlayer(state, 1)).toBe(false);
  });
});

describe('deal gate and cancel bets', () => {
  it('infers cards dealt when any bet exists (P1.4)', () => {
    expect(inferCardsDealtReady(undefined)).toBe(false);
    expect(
      inferCardsDealtReady(makeRound({ number: 5, dealer: 0, bets: [-1, -1, -1, -1] }))
    ).toBe(false);
    expect(
      inferCardsDealtReady(makeRound({ number: 5, dealer: 0, bets: [1, -1, -1, -1] }))
    ).toBe(true);
  });

  it('clears the last bettor on cancel so they can re-edit (P1.5)', () => {
    const round = makeRound({
      number: 5,
      dealer: 3, // start 0, last = 3
      bets: [1, 2, 0, 1],
    });
    const { playerIndex, bets } = cancelBetsEditTarget(round, 4);
    expect(playerIndex).toBe(3);
    expect(bets).toEqual([1, 2, 0, -1]);
  });
});
