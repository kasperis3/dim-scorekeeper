# Dim Scorekeeper

A React-based web application for scoring the card game "Dim". Built with TypeScript and Material-UI, this app provides a modern, intuitive interface for tracking scores in multiplayer games.

## TODOs:
- store complete games in database
- highlight bust vs successful hands in display scores
- hide bets once entered

## Features

- Support for 2-10 players
- Configurable number of rounds (1-13)
- Rotating suits (Spades → Hearts → Diamonds → Clubs → No Trump)
- Automatic dealer rotation
- Betting and hand recording with validation
- Real-time score calculation
- Visual indicators for:
  - Current round and dealer
  - Leading players (crown icons)
  - Completed rounds
  - Player turns
- Sound effects for key actions
- Responsive design for all screen sizes
- Confetti celebration for winners

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone [your-repo-url]
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm start
```

The app will open in your default browser at `http://localhost:3000`.

## Game Rules

1. Each round starts with a different number of cards and a rotating trump suit
2. Players must bet the number of hands they think they'll win
3. The total bets cannot equal the number of cards dealt
4. After all hands are played, scores are calculated:
   - Exact bet = 10 points + number of hands won
   - Missed bet = number of hands won

## Technologies Used

- React 18
- TypeScript
- Material-UI v5
- react-confetti
- react-use

## License

MIT License - feel free to use this code for your own projects!
