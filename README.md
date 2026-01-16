# 🐟 Fish Card Game

A real-time multiplayer strategic card game built with Next.js and Socket.IO.

## 🎮 Features

- **4-10 Players**: Even number of players (4, 6, 8, or 10)
- **Real-time Multiplayer**: WebSocket-based communication
- **Room-based System**: 6-digit room codes for easy joining
- **Strategic Gameplay**: Team-based card collection and claiming
- **Modern UI**: Beautiful, responsive design with Tailwind CSS
- **Pause Feature**: Pause the game to think strategically
- **Complete Game Log**: Track all moves and claims

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Clone the repository**
```bash
   git clone https://github.com/yourusername/fish-card-game.git
   cd fish-card-game
```

2. **Setup Server**
```bash
   cd server
   npm install
   cp .env.example .env
   npm start
```

3. **Setup Client** (in a new terminal)
```bash
   cd client
   npm install
   cp .env.local.example .env.local
   npm run dev
```

4. **Open your browser**
   - Navigate to `http://localhost:3000`
   - Create a room or join with a code
   - Invite friends!

## 📁 Project Structure
```
fish-card-game/
├── server/              # Backend (Node.js + Socket.IO)
│   ├── index.js        # Server entry point
│   ├── gameLogic.js    # Game rules and validation
│   └── package.json
│
└── client/             # Frontend (Next.js 14)
    ├── src/
    │   ├── app/        # Next.js app directory
    │   ├── components/ # React components
    │   ├── hooks/      # Custom React hooks
    │   └── lib/        # Utilities and constants
    └── package.json
```

## 🎯 Game Rules

### Setup
- 4-10 players (must be even)
- Deck: Standard 52 cards minus four 8s (48 cards)
- Cards divided into 8 half-suits (low: 2-7, high: 9-A)

### Gameplay
1. **Teams**: Players are divided into two equal teams
2. **Turns**: Players ask opponents for specific cards
3. **Legal Questions**: 
   - Must have a card in the same half-suit
   - Cannot ask for a card you already have
   - Can only ask opponent team members
4. **Claims**: When your team has all 6 cards of a half-suit, claim it!
5. **Winning**: Team with most half-suits wins

### Special Rules
- **Pause Button**: Stop the game to think strategically
- **Illegal Questions**: Turn switches to opponent if rules violated
- **Failed Claims**: Opponent team gets the half-suit

## 📝 API Documentation

### Socket.IO Events

#### Client → Server
- `CREATE_ROOM`: Create a new game room
- `JOIN_ROOM`: Join an existing room
- `START_GAME`: Start the game (host only)
- `ASK_CARD`: Request a card from opponent
- `MAKE_CLAIM`: Claim a half-suit
- `TOGGLE_PAUSE`: Pause/unpause the game

#### Server → Client
- `ROOM_CREATED`: Room creation confirmation
- `PLAYER_JOINED`: New player joined
- `PLAYER_LEFT`: Player disconnected
- `GAME_STARTED`: Game has begun
- `GAME_STATE_UPDATE`: Game state changed
- `ERROR`: Error occurred

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- Original Fish game from Bryn Mawr College's Distressing Math Collective
- Built with Next.js, React, Socket.IO, and Tailwind CSS
- Inspired by classic card games and strategic thinking

**Happy Playing! 🐟**
