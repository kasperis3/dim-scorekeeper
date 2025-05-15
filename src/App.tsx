import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useWindowSize } from 'react-use';
import Confetti from 'react-confetti';
import { 
  Container, 
  TextField, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Box,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  ButtonGroup
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { GameState, Round, Suit } from './types';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

const SUITS = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS, Suit.NO_TRUMP];
const STORAGE_KEY = 'cardGameState';
const DEFAULT_NAMES = ['Fuzzy', 'Duzzy', 'Kasper', 'Wesley', 'Mili', 'Tigger', 'Tiger', 'Goose', 'Moose', 'Fatty'];

const getHighestScore = (gameState: GameState): number => {
  let maxScore = -1;
  for (let i = 0; i < gameState.players; i++) {
    const score = gameState.rounds.reduce((sum, round) => sum + (round.scores[i] || 0), 0);
    maxScore = Math.max(maxScore, score);
  }
  return maxScore;
};

// Add sound effect URLs
const SOUNDS = {
  bet: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  confirm: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  complete: 'https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3',
  win: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3',
  timer: 'https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3'
};

function App() {
  const { width, height } = useWindowSize();
  const [gameState, setGameState] = useState<GameState | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  const [playerCount, setPlayerCount] = useState<string>('4');
  const [roundCount, setRoundCount] = useState<string>('10');
  const [playerNames, setPlayerNames] = useState<string[]>(() => DEFAULT_NAMES.slice(0, 4));
  const [error, setError] = useState<string>('');
  const [showNewGameDialog, setShowNewGameDialog] = useState(false);
  const [showNewGamePrompt, setShowNewGamePrompt] = useState(false);

  // Initialize current round first as it's needed by other states
  const [currentRoundIndex, setCurrentRoundIndex] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const state = JSON.parse(saved) as GameState;
      const firstIncompleteRoundIndex = state.rounds.findIndex(round => !round.isComplete);
      return firstIncompleteRoundIndex >= 0 ? firstIncompleteRoundIndex : state.rounds.length - 1;
    }
    return 0;
  });

  // Initialize bets confirmed state
  const [betsConfirmed, setBetsConfirmed] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const state = JSON.parse(saved) as GameState;
      const firstIncompleteRoundIndex = state.rounds.findIndex(round => !round.isComplete);
      if (firstIncompleteRoundIndex >= 0) {
        const round = state.rounds[firstIncompleteRoundIndex];
        return round.bets.every((bet: number) => bet !== -1) && round.hands.some(hand => hand !== -1);
      }
    }
    return false;
  });

  // Initialize hands confirmed state
  const [handsConfirmed, setHandsConfirmed] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const state = JSON.parse(saved) as GameState;
      const firstIncompleteRoundIndex = state.rounds.findIndex(round => !round.isComplete);
      if (firstIncompleteRoundIndex >= 0) {
        const round = state.rounds[firstIncompleteRoundIndex];
        return round.hands.every((hand: number) => hand !== -1);
      }
    }
    return false;
  });

  // Initialize current betting player
  const [currentBettingPlayer, setCurrentBettingPlayer] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const state = JSON.parse(saved) as GameState;
      const firstIncompleteRoundIndex = state.rounds.findIndex(round => !round.isComplete);
      if (firstIncompleteRoundIndex >= 0) {
        const round = state.rounds[firstIncompleteRoundIndex];
        if (round.bets.some(bet => bet === -1)) {
          const startIndex = (round.dealer + 1) % state.players;
          for (let i = 0; i < state.players; i++) {
            const playerIndex = (startIndex + i) % state.players;
            if (round.bets[playerIndex] === -1) {
              return playerIndex;
            }
          }
        }
      }
    }
    return -1;
  });

  // Initialize confirmation dialogs last, since they depend on other states
  const [showBetsConfirmation, setShowBetsConfirmation] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const state = JSON.parse(saved) as GameState;
      const firstIncompleteRoundIndex = state.rounds.findIndex(round => !round.isComplete);
      if (firstIncompleteRoundIndex >= 0) {
        const round = state.rounds[firstIncompleteRoundIndex];
        return round.bets.every((bet: number) => bet !== -1) && 
               !round.hands.some(hand => hand !== -1);
      }
    }
    return false;
  });

  const [showHandsConfirmation, setShowHandsConfirmation] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const state = JSON.parse(saved) as GameState;
      const firstIncompleteRoundIndex = state.rounds.findIndex(round => !round.isComplete);
      if (firstIncompleteRoundIndex >= 0) {
        const round = state.rounds[firstIncompleteRoundIndex];
        return round.hands.every((hand: number) => hand !== -1) && 
               !round.isComplete;
      }
    }
    return false;
  });

  const [showDealerReminder, setShowDealerReminder] = useState<boolean>(false);
  const [bettingTimer, setBettingTimer] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Add sound effect function before its usage
  const playSound = useCallback((soundType: keyof typeof SOUNDS) => {
    if (!soundEnabled) return;
    const audio = new Audio(SOUNDS[soundType]);
    audio.play().catch(() => {}); // Ignore errors if sound can't play
  }, [soundEnabled]);

  const isGameComplete = useCallback(() => {
    if (!gameState) return false;
    return gameState.rounds.every(round => round.isComplete);
  }, [gameState]);

  const isRoundActive = useCallback((roundIndex: number): boolean => {
    if (!gameState || isGameComplete()) return false;
    return roundIndex === currentRoundIndex;
  }, [gameState, currentRoundIndex, isGameComplete]);

  const findNextBettingPlayer = useCallback((round: Round): number => {
    if (!gameState) return -1;
    
    // Start with the player after the dealer
    const startIndex = (round.dealer + 1) % gameState.players;
    
    // Check each player in order
    for (let i = 0; i < gameState.players; i++) {
      const playerIndex = (startIndex + i) % gameState.players;
      if (round.bets[playerIndex] === -1) {
        return playerIndex;
      }
    }
    return -1; // All bets are entered
  }, [gameState]);

  useEffect(() => {
    if (gameState) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        ...gameState,
        currentRound: currentRoundIndex
      }));
      
      const currentRound = gameState.rounds[currentRoundIndex];
      if (!currentRound.isComplete && !betsConfirmed) {
        const nextPlayer = findNextBettingPlayer(currentRound);
        setCurrentBettingPlayer(nextPlayer);
      }
    }
  }, [gameState, findNextBettingPlayer, betsConfirmed, currentRoundIndex]);

  const initializeGame = (players: number, rounds: number) => {
    // Check for empty names
    if (playerNames.some(name => !name.trim())) {
      setError('All player names must be filled in');
      return;
    }

    // Reset all game states
    setBetsConfirmed(false);
    setHandsConfirmed(false);
    setShowBetsConfirmation(false);
    setShowHandsConfirmation(false);
    setError('');

    const roundsArray: Round[] = [];
    // Create rounds in descending order (highest to lowest)
    for (let i = rounds; i >= 1; i--) {
      roundsArray.push({
        number: i,
        suit: SUITS[(rounds - i) % SUITS.length],
        bets: Array(players).fill(-1),
        hands: Array(players).fill(-1),
        scores: Array(players).fill(0),
        dealer: i === rounds ? players - 1 : ((rounds - i - 1) % players),
        isComplete: false
      });
    }

    // Initialize with first round (highest number)
    const firstRound = roundsArray[0];
    const initialBettingPlayer = (firstRound.dealer + 1) % players;
    
    setCurrentRoundIndex(0);
    setCurrentBettingPlayer(initialBettingPlayer);
    
    setGameState({
      players,
      playerNames,
      currentRound: 0,
      rounds: roundsArray
    });
  };

  const areAllBetsEntered = (round: Round): boolean => {
    return round.bets.every(bet => bet !== -1);
  };

  const getValidNumbers = (round: Round, playerIndex: number): number[] => {
    // Calculate who the last player in the betting sequence is
    const startIndex = round.number === parseInt(roundCount) ? 0 : (round.dealer + 1) % gameState!.players;
    const lastPlayerIndex = (startIndex + gameState!.players - 1) % gameState!.players;

    // If this is the last player in sequence, restrict their numbers
    if (playerIndex === lastPlayerIndex) {
      const currentTotal = round.bets.reduce((sum, b, i) => 
        i === playerIndex ? sum : sum + (b === -1 ? 0 : b), 0);
      const forbiddenNumber = round.number - currentTotal;
      return Array.from({ length: round.number + 1 }, (_, i) => i)
        .filter(num => num !== forbiddenNumber);
    }
    
    // Otherwise return all possible numbers
    return Array.from({ length: round.number + 1 }, (_, i) => i);
  };

  const isPlayerTurn = (round: Round, playerIndex: number): boolean => {
    if (!betsConfirmed) {
      // During editing, follow the original order
      const startIndex = round.number === parseInt(roundCount) ? 0 : (round.dealer + 1) % gameState!.players;
      for (let i = 0; i < gameState!.players; i++) {
        const currentPlayerIndex = (startIndex + i) % gameState!.players;
        // Found the first unbet player or this player
        if (round.bets[currentPlayerIndex] === -1 || currentPlayerIndex === playerIndex) {
          return currentPlayerIndex === playerIndex;
        }
      }
      return false;
    }
    return playerIndex === currentBettingPlayer;
  };

  const handleBetChange = (roundIndex: number, playerIndex: number, bet: number) => {
    if (!gameState) return;
    setError('');
    
    const round = gameState.rounds[roundIndex];

    // Check if it's this player's turn to bet
    if (!isPlayerTurn(round, playerIndex)) {
      const nextPlayer = findNextBettingPlayer(round);
      if (nextPlayer !== -1) {
        setError(`It's ${gameState.playerNames[nextPlayer]}'s turn to bet`);
        return;
      }
    }
    
    playSound('bet');
    const newRounds = [...gameState.rounds];
    round.bets[playerIndex] = bet;
    
    // Find next player to bet
    const nextPlayer = findNextBettingPlayer(round);
    setCurrentBettingPlayer(nextPlayer);

    // Only show confirmation dialog when all bets are valid
    const allBetsValid = round.bets.every(bet => bet !== -1);
    
    if (nextPlayer === -1 && allBetsValid) {
      setCurrentRoundIndex(roundIndex);
      setShowBetsConfirmation(true);
    }

    setGameState({ ...gameState, rounds: newRounds });
  };

  // Add a helper function to check if bets are valid
  const areBetsValid = (round: Round): boolean => {
    // Check if all bets are entered
    if (!round.bets.every(bet => bet !== -1)) return false;
    
    // Check if total bets are valid for the round
    const totalBets = round.bets.reduce((sum, bet) => sum + bet, 0);
    return totalBets !== round.number; // Total bets should not equal round number
  };

  const getValidHandNumbers = (round: Round, playerIndex: number): number[] => {
    // Calculate how many hands are already assigned (excluding this player)
    const assignedHands = round.hands.reduce((sum, h, i) => 
      i === playerIndex ? sum : sum + (h === -1 ? 0 : h), 0);
    
    // Calculate how many hands are left to assign
    const remainingHands = round.number - assignedHands;
    
    // If this is the last player to record hands, they must take exactly the remaining hands
    const unassignedPlayers = round.hands.filter((h, i) => h === -1 && i !== playerIndex).length;
    if (unassignedPlayers === 0) {
      return [remainingHands];
    }
    
    // Otherwise, they can take any number from 0 up to remaining hands
    return Array.from({ length: remainingHands + 1 }, (_, i) => i);
  };

  const handleHandsChange = (roundIndex: number, playerIndex: number, hands: number) => {
    if (!gameState) return;
    if (!betsConfirmed) return;
    
    const newRounds = [...gameState.rounds];
    const round = newRounds[roundIndex];
    
    // Verify that all bets are still valid before allowing hands to be recorded
    if (!round.bets.every(bet => bet !== -1)) {
      setError('Cannot record hands because bets are missing. Please refresh the page.');
      setBetsConfirmed(false);
      return;
    }
    
    setError('');
    round.hands[playerIndex] = hands;
    
    // Calculate total hands assigned so far
    const totalHands = round.hands.reduce((sum, h) => sum + (h === -1 ? 0 : h), 0);
    
    // If total hands exceeds round number, show error
    if (totalHands > round.number) {
      setError(`Total hands cannot exceed ${round.number}`);
      round.hands[playerIndex] = -1; // Reset the invalid input
      setGameState({ ...gameState, rounds: newRounds });
      return;
    }
    
    // Calculate how many players still need to record hands
    const remainingPlayers = round.hands.filter(h => h === -1).length;
    
    // If all hands are recorded and total equals round number
    if (remainingPlayers === 0 && totalHands === round.number) {
      setCurrentRoundIndex(roundIndex);
      setShowHandsConfirmation(true);
    }
    
    setGameState({ ...gameState, rounds: newRounds });
  };

  const confirmBets = () => {
    if (!gameState) return;
    
    const round = gameState.rounds[currentRoundIndex];
    // Double check that all bets are valid before confirming
    if (!round.bets.every(bet => bet !== -1)) {
      setError('All bets must be entered before confirming');
      setBetsConfirmed(false);
      setShowBetsConfirmation(false);
      return;
    }

    playSound('confirm');
    setBetsConfirmed(true);
    setShowBetsConfirmation(false);
    setError('');
  };

  const cancelBetsConfirmation = () => {
    if (!gameState) return;
    
    // Reset the confirmation state but keep the bets
    setBetsConfirmed(false);
    
    // Find the next player who hasn't bet yet
    const round = gameState.rounds[currentRoundIndex];
    const nextPlayer = findNextBettingPlayer(round);
    setCurrentBettingPlayer(nextPlayer);
    
    setShowBetsConfirmation(false);
  };

  const confirmHands = () => {
    if (!gameState) return;
    const newRounds = [...gameState.rounds];
    const round = newRounds[currentRoundIndex];
    
    round.scores = round.hands.map((hands, i) => 
      hands === round.bets[i] ? 10 + hands : hands
    );
    round.isComplete = true;
    setHandsConfirmed(true);

    playSound('complete');

    // Move to next round if available
    const nextRoundIndex = currentRoundIndex + 1;
    if (nextRoundIndex < newRounds.length) {
      setCurrentRoundIndex(nextRoundIndex);
      setBetsConfirmed(false);
      setHandsConfirmed(false);
      const nextPlayer = findNextBettingPlayer(newRounds[nextRoundIndex]);
      setCurrentBettingPlayer(nextPlayer);
    } else {
      // Game is complete
      playSound('win');
    }
    
    setGameState({ 
      ...gameState, 
      rounds: newRounds,
      currentRound: nextRoundIndex < newRounds.length ? nextRoundIndex : currentRoundIndex
    });
    setShowHandsConfirmation(false);
    setError('');
  };

  const cancelHandsConfirmation = () => {
    if (!gameState) return;
    
    // Reset the confirmation dialog state
    setShowHandsConfirmation(false);
    
    // Reset hands that were entered for the current round
    const newRounds = [...gameState.rounds];
    const round = newRounds[currentRoundIndex];
    round.hands = Array(gameState.players).fill(-1);
    
    setGameState({ ...gameState, rounds: newRounds });
    setHandsConfirmed(false);
    setError('');
  };

  const handlePlayerNameChange = (index: number, name: string) => {
    const newNames = [...playerNames];
    newNames[index] = name.trim();  // Trim whitespace
    setPlayerNames(newNames);
  };

  const calculateTotalScore = useCallback((playerIndex: number): number => {
    if (!gameState) return 0;
    return gameState.rounds.reduce((sum, round) => sum + (round.scores[playerIndex] || 0), 0);
  }, [gameState]);

  const handleNewGame = () => {
    localStorage.removeItem(STORAGE_KEY);
    setGameState(null);
    setPlayerCount('4');  // Set default player count
    setPlayerNames(DEFAULT_NAMES.slice(0, 4));  // Set default player names
    setCurrentRoundIndex(0);
    setBetsConfirmed(false);
    setHandsConfirmed(false);
    setShowBetsConfirmation(false);
    setShowHandsConfirmation(false);
    setCurrentBettingPlayer(-1);
    setRoundCount('10');  // Set default round count
    setError('');
    setShowNewGameDialog(false);
    setShowNewGamePrompt(false);
  };

  const isLastBettingPlayer = (roundIndex: number, playerIndex: number): boolean => {
    if (!gameState || roundIndex !== currentRoundIndex) return false;
    const round = gameState.rounds[roundIndex];
    const startIndex = round.number === parseInt(roundCount) ? 0 : (round.dealer + 1) % gameState.players;
    const lastPlayerIndex = (startIndex + gameState.players - 1) % gameState.players;
    return playerIndex === lastPlayerIndex;
  };

  const isLastHandsInput = (round: Round): boolean => {
    const unrecordedCount = round.hands.filter(h => h === -1).length;
    return unrecordedCount === 1;
  };

  const getWinningPlayers = useCallback(() => {
    if (!gameState || !isGameComplete()) return [];
    
    // Find the highest score
    let maxScore = -1;
    for (let i = 0; i < gameState.players; i++) {
      const score = calculateTotalScore(i);
      maxScore = Math.max(maxScore, score);
    }
    
    // Get all players with the highest score
    return Array.from({ length: gameState.players }, (_, i) => i)
      .filter(playerIndex => calculateTotalScore(playerIndex) === maxScore);
  }, [gameState, calculateTotalScore, isGameComplete]);

  useEffect(() => {
    if (isGameComplete() && getWinningPlayers().length > 0) {
      const timer = setTimeout(() => {
        setShowNewGamePrompt(true);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowNewGamePrompt(false);
    }
  }, [isGameComplete, getWinningPlayers]);

  const formatHandsMessage = (validNumbers: number[], isLastHand: boolean) => {
    if (isLastHand) {
      const remaining = validNumbers[0];
      return `Must record ${remaining} hand${remaining !== 1 ? 's' : ''}`;
    }
    
    if (validNumbers.length <= 3) {
      if (validNumbers.length === 1) {
        return `Must record ${validNumbers[0]} hand${validNumbers[0] !== 1 ? 's' : ''}`;
      }
      if (validNumbers.length === 2) {
        return `Must record ${validNumbers[0]} or ${validNumbers[1]} hand${validNumbers[1] !== 1 ? 's' : ''}`;
      }
      // For exactly 3 numbers
      return `Must record ${validNumbers[0]}, ${validNumbers[1]}, or ${validNumbers[2]} hand${validNumbers[2] !== 1 ? 's' : ''}`;
    }
    
    return `Record 0-${validNumbers[validNumbers.length - 1]} hands`;
  };

  // Add an effect to handle auto-recovery from interrupted confirmations
  useEffect(() => {
    if (!gameState) return;
    
    const currentRound = gameState.rounds[currentRoundIndex];
    if (!currentRound || currentRound.isComplete) return;

    // If betsConfirmed is true but any bets are missing, reset the state
    if (betsConfirmed && currentRound.bets.some(bet => bet === -1)) {
      setBetsConfirmed(false);
      setError('Bets are missing. Please re-enter all bets.');
      
      // Reset hands since bets are invalid
      const newRounds = [...gameState.rounds];
      newRounds[currentRoundIndex] = {
        ...currentRound,
        hands: Array(gameState.players).fill(-1)
      };
      setGameState({ ...gameState, rounds: newRounds });
    }

    // If we're recording hands but bets aren't confirmed, reset to betting phase
    if (currentRound.hands.some(hand => hand !== -1) && !betsConfirmed) {
      const newRounds = [...gameState.rounds];
      newRounds[currentRoundIndex] = {
        ...currentRound,
        hands: Array(gameState.players).fill(-1)
      };
      setGameState({ ...gameState, rounds: newRounds });
    }
  }, [gameState, currentRoundIndex, betsConfirmed]);

  const handleNewGameClick = () => {
    setShowNewGameDialog(true);
    setShowNewGamePrompt(false); // Hide the winner announcement when showing new game dialog
  };

  // Add this effect to handle the betting timer
  useEffect(() => {
    if (!gameState || !isRoundActive(currentRoundIndex)) return;
    
    const BETTING_TIME = 30; // seconds
    if (currentBettingPlayer !== -1 && !betsConfirmed) {
      setBettingTimer(BETTING_TIME);
      const interval = setInterval(() => {
        setBettingTimer(prev => {
          if (prev === null || prev <= 0) {
            clearInterval(interval);
            return null;
          }
          if (prev <= 5) {
            playSound('timer');
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    } else {
      setBettingTimer(null);
    }
  }, [gameState, currentRoundIndex, currentBettingPlayer, betsConfirmed, playSound, isRoundActive]);

  // Add this effect to show dealer reminder
  useEffect(() => {
    if (!gameState || !isRoundActive(currentRoundIndex)) return;
    
    const currentRound = gameState.rounds[currentRoundIndex];
    if (!currentRound.isComplete && !betsConfirmed && currentBettingPlayer === (currentRound.dealer + 1) % gameState.players) {
      setShowDealerReminder(true);
      const timer = setTimeout(() => setShowDealerReminder(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [gameState, currentRoundIndex, currentBettingPlayer, betsConfirmed, gameState?.players, isRoundActive]);

  // Create theme - simplified for light mode only
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: 'light',
          primary: {
            main: '#7C4DFF',
            dark: '#6039CC',
            light: '#9E7BFF',
          },
          background: {
            default: '#ffffff',
            paper: '#ffffff',
          },
          text: {
            primary: '#1a237e',
            secondary: '#666666',
          },
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundColor: '#ffffff',
                borderColor: 'rgba(124, 77, 255, 0.2)',
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              root: {
                borderColor: 'rgba(224, 224, 224, 1)',
              },
              head: {
                fontWeight: 600,
                color: '#1a237e',
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
              },
            },
          },
          MuiIconButton: {
            styleOverrides: {
              root: {
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'scale(1.1)',
                },
              },
            },
          },
        },
      }),
    []
  );

  if (!gameState) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Container maxWidth="sm" sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          pt: 4,
          pb: 8
        }}>
          <Box sx={{ 
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.95))',
            borderRadius: '24px',
            p: { xs: 3, sm: 6 },
            boxShadow: '0 8px 32px rgba(124, 77, 255, 0.15)',
            border: '1px solid rgba(124, 77, 255, 0.2)',
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: -1,
              background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cpath d='M15 15h30v30H15z' stroke='%23979797' stroke-width='2'/%3E%3Cpath d='M20 20h20v20H20z' stroke='%23979797' stroke-width='2'/%3E%3Cpath d='M25 25h10v10H25z' stroke='%23979797' stroke-width='2'/%3E%3C/g%3E%3C/svg%3E")`,
              opacity: 0.1
            }
          }}>
            <Typography 
              variant="h2" 
              gutterBottom 
              sx={{ 
                fontWeight: 800,
                color: '#7C4DFF',
                mb: 4,
                textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
                position: 'relative',
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  bottom: '-10px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '80px',
                  height: '4px',
                  backgroundColor: '#7C4DFF',
                  borderRadius: '2px'
                }
              }}
            >
              Dim Scorekeeper
            </Typography>

            <Box sx={{ mb: 4 }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  mb: 3,
                  color: '#1a237e',
                  fontWeight: 600
                }}
              >
                Game Setup
              </Typography>

              <FormControl 
                fullWidth 
                sx={{ 
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px'
                  }
                }}
              >
                <InputLabel>Number of Players</InputLabel>
                <Select
                  value={playerCount}
                  label="Number of Players"
                  onChange={(e) => {
                    const count = Number(e.target.value);
                    setPlayerCount(e.target.value);
                    setPlayerNames(DEFAULT_NAMES.slice(0, count));
                  }}
                  sx={{
                    fontSize: '1.1rem'
                  }}
                >
                  {Array.from({ length: 9 }, (_, i) => i + 2).map((num) => (
                    <MenuItem 
                      key={num} 
                      value={num}
                      sx={{
                        fontSize: '1.1rem',
                        py: 1.5
                      }}
                    >
                      {num} Players
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl 
                fullWidth 
                sx={{ 
                  mb: 4,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px'
                  }
                }}
              >
                <InputLabel>Number of Rounds</InputLabel>
                <Select
                  value={roundCount || '10'}
                  label="Number of Rounds"
                  onChange={(e) => setRoundCount(e.target.value)}
                  sx={{
                    fontSize: '1.1rem'
                  }}
                >
                  {Array.from({ length: 13 }, (_, i) => i + 1).map((num) => (
                    <MenuItem 
                      key={num} 
                      value={num}
                      sx={{
                        fontSize: '1.1rem',
                        py: 1.5
                      }}
                    >
                      {num} {num === 1 ? 'Round' : 'Rounds'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  mb: 3,
                  color: '#1a237e',
                  fontWeight: 600
                }}
              >
                Player Names
              </Typography>
              {playerNames.map((name, index) => (
                <TextField
                  key={index}
                  label={`Player ${index + 1}`}
                  placeholder={`e.g. ${DEFAULT_NAMES[index]}`}
                  value={name || ''}
                  onChange={(e) => handlePlayerNameChange(index, e.target.value)}
                  fullWidth
                  sx={{ 
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '12px'
                    },
                    '& .MuiInputBase-input::placeholder': {
                      opacity: 0.7,
                      color: 'text.secondary'
                    }
                  }}
                />
              ))}
            </Box>

            <Button 
              variant="contained" 
              onClick={() => {
                setError('');
                const players = parseInt(playerCount || '4');
                const rounds = parseInt(roundCount || '10');
                if (players > 1 && rounds > 0) initializeGame(players, rounds);
              }}
              disabled={!playerCount && !roundCount}
              sx={{
                backgroundColor: '#7C4DFF',
                fontSize: '1.2rem',
                py: 1.5,
                px: 4,
                borderRadius: '12px',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  backgroundColor: '#6039CC',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 20px rgba(124, 77, 255, 0.3)'
                },
                transition: 'all 0.2s ease-in-out'
              }}
            >
              Start Game
            </Button>
          </Box>
          {error && (
            <Typography 
              color="error" 
              sx={{ 
                mt: 2,
                textAlign: 'center',
                fontWeight: 'bold',
                animation: 'fadeIn 0.3s ease-in',
                '@keyframes fadeIn': {
                  from: { opacity: 0, transform: 'translateY(-10px)' },
                  to: { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              {error}
            </Typography>
          )}
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth={false} sx={{ px: { xs: 2, sm: 4, md: 6, lg: 8 } }}>
        {isGameComplete() && getWinningPlayers().length > 0 && (
          <Box sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 1299, // Just below Material-UI's dialog z-index of 1300
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Box sx={{
              position: 'absolute',
              top: '30%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              padding: '24px 48px',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(124, 77, 255, 0.25)',
              animation: 'fadeInDown 1s ease-out',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              pointerEvents: 'auto',
              '@keyframes fadeInDown': {
                from: {
                  opacity: 0,
                  transform: 'translate(-50%, -100%)'
                },
                to: {
                  opacity: 1,
                  transform: 'translate(-50%, -50%)'
                }
              }
            }}>
              <Typography variant="h2" sx={{ 
                color: '#7C4DFF',
                fontWeight: 800,
                textAlign: 'center',
                textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
              }}>
                {getWinningPlayers().length === 1 
                  ? `${gameState?.playerNames[getWinningPlayers()[0]]} Wins! 🏆`
                  : 'It\'s a Tie! 🏆'}
              </Typography>
              {getWinningPlayers().length > 1 && (
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Typography variant="h4" sx={{ 
                    color: '#1a237e',
                    textAlign: 'center',
                    fontWeight: 700
                  }}>
                    Winners:
                  </Typography>
                  {getWinningPlayers().map(playerIndex => (
                    <Typography key={playerIndex} variant="h5" sx={{
                      color: '#7C4DFF',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>👑</span>
                      {gameState?.playerNames[playerIndex]}
                      <span>({calculateTotalScore(playerIndex)} points)</span>
                    </Typography>
                  ))}
                </Box>
              )}
              {showNewGamePrompt && (
                <Box sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                  animation: 'fadeIn 0.5s ease-out',
                  '@keyframes fadeIn': {
                    from: { opacity: 0 },
                    to: { opacity: 1 }
                  }
                }}>
                  <Typography variant="h4" sx={{ 
                    color: '#1a237e',
                    textAlign: 'center',
                    mt: 2
                  }}>
                    Want to start a new game?
                  </Typography>
                  <Button 
                    variant="contained" 
                    onClick={handleNewGameClick}
                    sx={{
                      backgroundColor: '#7C4DFF',
                      fontSize: '1.2rem',
                      padding: '12px 32px',
                      '&:hover': {
                        backgroundColor: '#6039CC'
                      }
                    }}
                  >
                    New Game
                  </Button>
                </Box>
              )}
            </Box>
            <Confetti
              width={width}
              height={height}
              numberOfPieces={2000}
              recycle={false}
              colors={['#7C4DFF', '#FF0000', '#000000', '#4CAF50']}
              style={{ position: 'fixed', top: 0, left: 0 }}
              gravity={0.05}
              initialVelocityY={30}
              initialVelocityX={{ min: -20, max: 20 }}
              tweenDuration={10000}
              friction={0.97}
            />
          </Box>
        )}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          position: 'relative',
          mt: 3,
          mb: 4,
          px: { xs: 2, sm: 3, md: 4 },
          '&::before': {
            content: '""',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
              linear-gradient(45deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.9) 100%),
              url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cpath d='M15 15h30v30H15z' stroke='%23979797' stroke-width='2'/%3E%3Cpath d='M20 20h20v20H20z' stroke='%23979797' stroke-width='2'/%3E%3Cpath d='M25 25h10v10H25z' stroke='%23979797' stroke-width='2'/%3E%3C/g%3E%3C/svg%3E")
            `,
            backgroundRepeat: 'repeat',
            opacity: 0.5,
            zIndex: -1
          }
        }}>
          <Typography variant="h3" sx={{ 
            fontWeight: 'bold',
            color: '#7C4DFF',
            textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
          }}>
            Dim Scorekeeper
          </Typography>
          <ButtonGroup 
            variant="outlined" 
            sx={{ 
              backgroundColor: '#ffffff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              borderRadius: '24px',
              padding: '6px',
              ml: 2,
              '& .MuiButtonGroup-grouped': {
                border: 'none',
                minWidth: '44px',
                height: '44px',
                margin: '0 2px',
                transition: 'all 0.2s ease-in-out',
                '&:not(:last-of-type)': {
                  borderRight: '1px solid rgba(0, 0, 0, 0.12)'
                },
                '&:hover': {
                  backgroundColor: 'rgba(124, 77, 255, 0.08)',
                  transform: 'translateY(-1px)',
                }
              }
            }}
          >
            <IconButton 
              onClick={() => setShowNewGameDialog(true)}
              sx={{ 
                color: '#7C4DFF',
                fontSize: '1.2rem',
                '&:hover': {
                  color: '#9E7BFF',
                }
              }}
            >
              <RestartAltIcon />
            </IconButton>
            <IconButton 
              onClick={() => setSoundEnabled(prev => !prev)} 
              sx={{ 
                color: '#7C4DFF',
                fontSize: '1.2rem',
                '&:hover': {
                  color: '#9E7BFF',
                }
              }}
            >
              {soundEnabled ? '🔊' : '🔇'}
            </IconButton>
          </ButtonGroup>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Paper elevation={3} sx={{ 
          p: { xs: 1, sm: 2, md: 3 }, 
          borderRadius: 2,
          border: '2px solid rgba(124, 77, 255, 0.2)',
          boxShadow: '0 4px 20px rgba(124, 77, 255, 0.1)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <TableContainer>
            <Table size="small" sx={{
              '& .MuiTableCell-root': {
                color: '#1a237e',
                transition: 'background-color 0.2s ease-in-out',
              },
              '& .MuiTableRow-root': {
                transition: 'background-color 0.2s ease-in-out',
                '&:nth-of-type(odd)': {
                  backgroundColor: 'rgba(0, 0, 0, 0.02)',
                },
                '&:hover': {
                  backgroundColor: 'rgba(124, 77, 255, 0.05)',
                },
              },
              '& .MuiTableRow-root.Mui-selected': {
                backgroundColor: 'rgba(124, 77, 255, 0.08)',
                '&:hover': {
                  backgroundColor: 'rgba(124, 77, 255, 0.12)',
                },
              },
              '& .MuiTableHead-root': {
                '& .MuiTableRow-root': {
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                },
              },
            }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ 
                    textAlign: 'center',
                    padding: { xs: '12px 8px', sm: '16px 12px', md: '20px 16px' },
                    minWidth: { xs: '80px', sm: '100px', md: '120px' }
                  }}>
                    <Typography variant="h5" sx={{ 
                      fontWeight: 800,
                      color: '#1a237e',
                      letterSpacing: '0.02em'
                    }}>
                      ROUND
                    </Typography>
                  </TableCell>
                  {Array.from({ length: gameState.players }, (_, i) => (
                    <TableCell 
                      key={i}
                      sx={{
                        position: 'relative',
                        textAlign: 'center',
                        minWidth: { xs: '100px', sm: '120px', md: '140px' }
                      }}
                    >
                      <Box sx={{ 
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        pt: 1
                      }}>
                        {calculateTotalScore(i) > 0 && calculateTotalScore(i) === getHighestScore(gameState) && (
                          <Typography 
                            component="span" 
                            sx={{ 
                              position: 'absolute',
                              top: '-24px',
                              fontSize: '24px',
                              animation: 'floatCrown 2s ease-in-out infinite',
                              '@keyframes floatCrown': {
                                '0%, 100%': { transform: 'translateY(0)' },
                                '50%': { transform: 'translateY(-5px)' }
                              }
                            }}
                          >
                            👑
                          </Typography>
                        )}
                        <Typography variant="h5" sx={{ 
                          fontWeight: 700,
                          color: '#1a237e',
                          letterSpacing: '0.02em'
                        }}>
                          {gameState.playerNames[i]}
                        </Typography>
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {gameState.rounds.map((round, roundIndex) => (
                  <TableRow 
                    key={roundIndex}
                    sx={{
                      backgroundColor: isRoundActive(roundIndex)
                        ? 'rgba(124, 77, 255, 0.15)'  // Vivid purple background for current round
                        : round.isComplete 
                          ? 'rgba(76, 175, 80, 0.25)'  // More vibrant green for completed rounds
                          : 'inherit',
                      opacity: !isRoundActive(roundIndex) && !round.isComplete ? 0.5 : 1,
                      '& .MuiTableCell-root': {
                        position: 'relative',
                        ...(isRoundActive(roundIndex) && {
                          padding: '24px 16px',
                          fontSize: '1.15rem',
                          transform: 'scale(1.02)',
                          boxShadow: '0 2px 12px rgba(124, 77, 255, 0.3)',  // Matching purple shadow
                          zIndex: 1,
                          transition: 'all 0.2s ease-in-out',
                          borderRadius: '4px'
                        }),
                        ...(round.isComplete && {
                          borderColor: 'rgba(76, 175, 80, 0.3)'  // Green border for completed rounds
                        })
                      },
                      transition: 'background-color 0.2s ease-in-out',
                      '&:hover': {
                        backgroundColor: isRoundActive(roundIndex)
                          ? 'rgba(124, 77, 255, 0.2)'
                          : round.isComplete
                            ? 'rgba(76, 175, 80, 0.3)'
                            : 'rgba(0, 0, 0, 0.02)'
                      }
                    }}
                  >
                    <TableCell>
                      <Box>
                        <Typography variant="h4" sx={{ 
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 1.5,
                          color: '#1a237e'
                        }}>
                          {round.number} 
                          <Box 
                            component="span" 
                            sx={{ 
                              display: 'inline-flex',
                              alignItems: 'center',
                              fontSize: round.suit === Suit.NO_TRUMP ? '0.8em' : '1em',
                              animation: isRoundActive(roundIndex) ? 'floatSuit 2s ease-in-out infinite' : 'none',
                              '@keyframes floatSuit': {
                                '0%, 100%': {
                                  transform: 'translateY(0)'
                                },
                                '50%': {
                                  transform: 'translateY(-5px)'
                                }
                              }
                            }}
                          >
                            {round.suit === Suit.SPADES && <span style={{ color: '#000000' }}>♠</span>}
                            {round.suit === Suit.HEARTS && <span style={{ color: '#FF0000' }}>♥</span>}
                            {round.suit === Suit.DIAMONDS && <span style={{ color: '#FF0000' }}>♦</span>}
                            {round.suit === Suit.CLUBS && <span style={{ color: '#000000' }}>♣</span>}
                            {round.suit === Suit.NO_TRUMP && (
                              <Box sx={{ 
                                border: '2px solid #1a237e',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '0.5em',
                                fontWeight: 800,
                                letterSpacing: '0.05em',
                                background: isRoundActive(roundIndex) ? 'linear-gradient(45deg, #1a237e, #7C4DFF)' : '#1a237e',
                                color: 'white',
                                transition: 'all 0.3s ease'
                              }}>
                                NT
                              </Box>
                            )}
                          </Box>
                        </Typography>
                        <Box sx={{
                          display: 'flex',
                          justifyContent: 'center',
                          width: '100%',
                          mt: 1
                        }}>
                          <Typography variant="caption" color="textSecondary" sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 1,
                            backgroundColor: '#ffffff',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            border: '1px solid #7C4DFF',
                            color: '#7C4DFF',
                            fontWeight: 600,
                            width: 'fit-content',
                            boxShadow: '0 1px 3px rgba(124, 77, 255, 0.1)'
                          }}>
                            <span style={{ fontSize: '16px' }}>⭐️</span>
                            Dealer: {gameState.playerNames[round.dealer]}
                          </Typography>
                        </Box>
                        {roundIndex === currentRoundIndex && !round.isComplete && !areAllBetsEntered(round) && currentBettingPlayer !== -1 && (
                          <Typography variant="caption" sx={{ 
                            display: 'block', 
                            color: 'primary.main', 
                            fontWeight: 'bold',
                            textAlign: 'center',
                            mt: 1
                          }}>
                            {gameState.playerNames[currentBettingPlayer]}'s turn to bet
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    {Array.from({ length: gameState.players }, (_, playerIndex) => (
                      <TableCell 
                        key={playerIndex}
                        sx={{
                          position: 'relative',
                          border: currentBettingPlayer === playerIndex && 
                                 !round.isComplete && 
                                 roundIndex === currentRoundIndex
                            ? '3px solid #7C4DFF'  // Vivid purple border for current player
                            : isLastBettingPlayer(roundIndex, playerIndex) && 
                              !round.isComplete && 
                              roundIndex === currentRoundIndex
                              ? '3px dashed #7C4DFF'  // Matching purple for last player
                              : '1px solid rgba(224, 224, 224, 1)',
                          padding: 1
                        }}
                      >
                        <Box sx={{ 
                          display: 'grid', 
                          gridTemplateAreas: `
                            "bet hands"
                            "score score"
                            "status status"
                          `,
                          gridTemplateColumns: '1fr 1fr',
                          gap: 1,
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          padding: 1
                        }}>
                          <Box sx={{ gridArea: 'bet' }}>
                            <FormControl sx={{ width: '80px' }}>
                              <Select
                                value={round.bets[playerIndex] === -1 ? '' : round.bets[playerIndex]}
                                onChange={(e) => handleBetChange(roundIndex, playerIndex, Number(e.target.value))}
                                size="small"
                                disabled={
                                  round.isComplete || 
                                  !isRoundActive(roundIndex) ||
                                  !isPlayerTurn(round, playerIndex) ||
                                  betsConfirmed
                                }
                                IconComponent={
                                  (round.isComplete || betsConfirmed || !isRoundActive(roundIndex) || !isPlayerTurn(round, playerIndex)) 
                                    ? () => null 
                                    : undefined
                                }
                                sx={{
                                  ...(round.isComplete && {
                                    fieldset: { border: 'none' },
                                    '&.MuiOutlinedInput-root': {
                                      border: 'none',
                                      backgroundColor: 'transparent'
                                    },
                                    '& .MuiSelect-select': {
                                      padding: 0,
                                      backgroundColor: 'transparent'
                                    },
                                    '&:hover': {
                                      backgroundColor: 'transparent',
                                      fieldset: { border: 'none' }
                                    }
                                  })
                                }}
                              >
                                <MenuItem value="">
                                  <em>-</em>
                                </MenuItem>
                                {getValidNumbers(round, playerIndex).map((num) => (
                                  <MenuItem key={num} value={num}>
                                    {num}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Box>
                          <Box sx={{ gridArea: 'hands' }}>
                            <FormControl sx={{ width: '80px' }}>
                              <Select
                                value={round.hands[playerIndex] === -1 ? '' : round.hands[playerIndex]}
                                onChange={(e) => handleHandsChange(roundIndex, playerIndex, Number(e.target.value))}
                                size="small"
                                disabled={
                                  round.isComplete || 
                                  !isRoundActive(roundIndex) ||
                                  !betsConfirmed || 
                                  handsConfirmed
                                }
                                IconComponent={
                                  (round.isComplete || !betsConfirmed || !isRoundActive(roundIndex) || handsConfirmed)
                                    ? () => null 
                                    : undefined
                                }
                                sx={{
                                  ...(round.isComplete && {
                                    fieldset: { border: 'none' },
                                    '&.MuiOutlinedInput-root': {
                                      border: 'none',
                                      backgroundColor: 'transparent'
                                    },
                                    '& .MuiSelect-select': {
                                      padding: 0,
                                      backgroundColor: 'transparent'
                                    },
                                    '&:hover': {
                                      backgroundColor: 'transparent',
                                      fieldset: { border: 'none' }
                                    }
                                  })
                                }}
                              >
                                <MenuItem value="">
                                  <em>-</em>
                                </MenuItem>
                                {getValidHandNumbers(round, playerIndex).map((num) => (
                                  <MenuItem key={num} value={num}>
                                    {num}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Box>
                          <Box sx={{ 
                            gridArea: 'score',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                          }}>
                            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                              {round.scores[playerIndex] || 0}
                            </Typography>
                          </Box>
                          {isRoundActive(roundIndex) && !round.isComplete && (
                            <Box sx={{ 
                              gridArea: 'status',
                              mt: 1,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 0.5
                            }}>
                              {!betsConfirmed && isLastBettingPlayer(roundIndex, playerIndex) && (
                                <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 'bold' }}>
                                  {round.number - round.bets.reduce((sum, b, i) => i === playerIndex ? sum : sum + (b === -1 ? 0 : b), 0) < 0 
                                    ? 'You can bet anything because everyone has over bet!'
                                    : `Cannot bet ${round.number - round.bets.reduce((sum, b, i) => i === playerIndex ? sum : sum + (b === -1 ? 0 : b), 0)}`
                                  }
                                </Typography>
                              )}
                              {!betsConfirmed && playerIndex === currentBettingPlayer && (
                                <Typography variant="caption" sx={{ color: 'primary.main' }}>
                                  Your turn to bet
                                </Typography>
                              )}
                              {betsConfirmed && !handsConfirmed && round.hands[playerIndex] === -1 && (
                                <Typography variant="caption" sx={{ color: 'primary.main' }}>
                                  {isLastHandsInput(round) 
                                    ? formatHandsMessage([round.number - round.hands.reduce((sum, h) => sum + (h === -1 ? 0 : h), 0)], true)
                                    : formatHandsMessage(getValidHandNumbers(round, playerIndex), false)}
                                </Typography>
                              )}
                            </Box>
                          )}
                        </Box>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                <TableRow sx={{ 
                  backgroundColor: 'rgba(124, 77, 255, 0.05)',
                  borderTop: '2px solid rgba(124, 77, 255, 0.2)'
                }}>
                  <TableCell>
                    <Typography variant="h4" sx={{ 
                      fontWeight: 800,
                      color: '#1a237e',
                      letterSpacing: '0.02em'
                    }}>
                      TOTAL
                    </Typography>
                  </TableCell>
                  {Array.from({ length: gameState.players }, (_, playerIndex) => (
                    <TableCell key={playerIndex}>
                      <Typography 
                        variant="h4" 
                        sx={{ 
                          textAlign: 'center',
                          fontWeight: 800,
                          color: calculateTotalScore(playerIndex) === getHighestScore(gameState) ? '#7C4DFF' : '#1a237e',
                          padding: '12px 24px',
                          borderRadius: '12px',
                          transition: 'all 0.3s ease',
                          position: 'relative',
                          ...(calculateTotalScore(playerIndex) === getHighestScore(gameState) && {
                            transform: 'scale(1.1)',
                            '&::before': {
                              content: '"👑"',
                              position: 'absolute',
                              top: '-24px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              fontSize: '24px'
                            }
                          })
                        }}
                      >
                        {calculateTotalScore(playerIndex)}
                      </Typography>
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        <Dialog 
          open={showNewGameDialog} 
          onClose={() => setShowNewGameDialog(false)}
          sx={{
            '& .MuiDialog-paper': {
              backgroundColor: 'white',
              boxShadow: '0 8px 32px rgba(124, 77, 255, 0.25)',
              borderRadius: '16px',
              padding: '16px'
            }
          }}
        >
          <DialogTitle sx={{ 
            color: '#7C4DFF',
            fontWeight: 700,
            textAlign: 'center',
            fontSize: '1.5rem'
          }}>
            Start New Game?
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ 
              color: '#1a237e',
              textAlign: 'center',
              mb: 2
            }}>
              This will reset the current game. Are you sure you want to continue?
            </Typography>
          </DialogContent>
          <DialogActions sx={{ 
            justifyContent: 'center',
            gap: 2,
            pb: 2
          }}>
            <Button 
              onClick={() => {
                setShowNewGameDialog(false);
                setShowNewGamePrompt(true); // Restore the winner prompt if they cancel
              }}
              sx={{ 
                color: '#666',
                fontWeight: 600
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleNewGame} 
              variant="contained" 
              sx={{
                backgroundColor: '#7C4DFF',
                '&:hover': {
                  backgroundColor: '#6039CC'
                }
              }}
            >
              Start New Game
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={showBetsConfirmation} onClose={cancelBetsConfirmation}>
          <DialogTitle>Confirm Bets</DialogTitle>
          <DialogContent>
            <Typography>
              Are all bets entered correctly? You won't be able to change them after confirmation.
            </Typography>
            {gameState && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                  Current Bets:
                </Typography>
                {gameState.playerNames.map((name, index) => (
                  <Typography key={index}>
                    {name}: {gameState.rounds[currentRoundIndex].bets[index]}
                  </Typography>
                ))}
                <Typography sx={{ mt: 1, color: 'primary.main', fontWeight: 'bold' }}>
                  Total: {gameState.rounds[currentRoundIndex].bets.reduce((sum, bet) => sum + bet, 0)} / {gameState.rounds[currentRoundIndex].number}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelBetsConfirmation}>No, Keep Editing</Button>
            <Button 
              onClick={confirmBets} 
              variant="contained" 
              color="primary"
              disabled={!gameState || (gameState && !areBetsValid(gameState.rounds[currentRoundIndex]))}
            >
              Yes, Confirm Bets
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog open={showHandsConfirmation} onClose={cancelHandsConfirmation}>
          <DialogTitle>Confirm Hands</DialogTitle>
          <DialogContent>
            <Typography>
              Are all hands recorded correctly? This will complete the round.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelHandsConfirmation}>No, Keep Editing</Button>
            <Button onClick={confirmHands} variant="contained" color="primary">
              Yes, Complete Round
            </Button>
          </DialogActions>
        </Dialog>

        {(showDealerReminder || bettingTimer !== null) && (
          <Box sx={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2
          }}>
            {showDealerReminder && (
              <Alert 
                severity="info"
                sx={{
                  animation: 'slideDown 0.3s ease-out',
                  '@keyframes slideDown': {
                    from: { transform: 'translateY(-20px)', opacity: 0 },
                    to: { transform: 'translateY(0)', opacity: 1 }
                  }
                }}
              >
                Don't forget to deal the cards! 🎴
              </Alert>
            )}
            {bettingTimer !== null && bettingTimer <= 10 && (
              <Alert 
                severity={bettingTimer <= 5 ? "warning" : "info"}
                sx={{
                  animation: bettingTimer <= 5 ? 'pulse 1s ease-in-out infinite' : 'none',
                  '@keyframes pulse': {
                    '0%, 100%': { transform: 'scale(1)' },
                    '50%': { transform: 'scale(1.05)' }
                  }
                }}
              >
                {bettingTimer} seconds to bet!
              </Alert>
            )}
          </Box>
        )}
      </Container>
    </ThemeProvider>
  );
}

export default App; 