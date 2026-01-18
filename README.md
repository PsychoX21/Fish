# 🐟 Fish Card Game

A real-time multiplayer strategic card game built with Next.js and Socket.IO.

## 🎮 Features

- **4-10 Players**: Even number of players (4, 6, 8, or 10)
- **Real-time Multiplayer**: WebSocket-based communication
- **Room-based System**: 6-digit room codes for easy joining
- **Team Theming**: Red Team vs Blue Team with visual distinction
- **Pre-Game Team Setup**: Swap teammates before the game starts
- **Google Authentication**: Sign in with Google for player identity
- **Reconnection System**: 60-second window to rejoin if disconnected
- **Strategic Gameplay**: Team-based card collection and claiming
- **Modern UI**: Beautiful, responsive design with Tailwind CSS
- **Pause Feature**: Pause the game to think strategically
- **Complete Game Log**: Track all moves and claims

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Firebase project (for Google Authentication)

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
npm start
```

3. **Setup Client** (in a new terminal)
```bash
cd client
npm install
```

4. **Configure Firebase** (for Google Sign-In)
   - Create a project at [Firebase Console](https://console.firebase.google.com)
   - Enable Google Sign-In in Authentication → Sign-in method
   - Create a Web App and copy the config
   - Create `client/.env.local`:
```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

5. **Run the client**
```bash
npm run dev
```

6. **Open your browser**
   - Navigate to `http://localhost:3000`
   - Sign in with Google (optional, enables reconnection)
   - Create a room or join with a code
   - Invite friends!

## ☁️ Deployment

### Client (Vercel)

1. Connect your GitHub repo to Vercel
2. Set environment variables:
```
NEXT_PUBLIC_SOCKET_URL=https://your-server.onrender.com
NEXT_PUBLIC_FIREBASE_API_KEY=your_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```
3. Add your Vercel domain to Firebase authorized domains

### Server (Render)

1. Create a new Web Service on Render
2. Set environment variables:
```
CORS_ORIGIN=https://your-app.vercel.app
PORT=3001
```

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
    │   │   ├── HomeScreen.js      # Login & room creation
    │   │   ├── LobbyScreen.js     # Pre-game waiting room
    │   │   ├── TeamSetupScreen.js # Team swap interface
    │   │   ├── GameScreen.js      # Main game UI
    │   │   └── DisconnectOverlay.js # Reconnection countdown
    │   ├── contexts/   # React contexts (Auth)
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
1. **Teams**: Players are divided into Red Team and Blue Team
2. **Team Swap**: Before starting, players can request to swap with opponents
3. **Turns**: Players ask opponents for specific cards
4. **Legal Questions**: 
   - Must have a card in the same half-suit
   - Cannot ask for a card you already have
   - Can only ask opponent team members
5. **Claims**: When your team has all 6 cards of a half-suit, claim it!
6. **Winning**: Team with most half-suits wins

### Special Rules
- **Pause Button**: Stop the game to think strategically
- **Illegal Questions**: Turn switches to opponent if rules violated
- **Failed Claims**: Opponent team gets the half-suit
- **Disconnection**: Game pauses for 60 seconds, cards redistributed if timeout

## 📝 API Documentation

### Socket.IO Events

#### Client → Server
| Event | Description |
|-------|-------------|
| `CREATE_ROOM` | Create a new game room |
| `JOIN_ROOM` | Join an existing room |
| `START_GAME` | Start team setup (host only) |
| `RANDOMIZE_TEAMS` | Re-shuffle teams |
| `SWAP_REQUEST` | Request to swap with opponent |
| `SWAP_RESPONSE` | Accept/decline swap request |
| `CONFIRM_TEAMS` | Start game with current teams |
| `ASK_CARD` | Request a card from opponent |
| `MAKE_CLAIM` | Claim a half-suit |
| `TOGGLE_PAUSE` | Pause/unpause the game |

#### Server → Client
| Event | Description |
|-------|-------------|
| `ROOM_CREATED` | Room creation confirmation |
| `PLAYER_JOINED` | New player joined |
| `PLAYER_LEFT` | Player disconnected |
| `TEAMS_ASSIGNED` | Teams randomly assigned |
| `SWAP_REQUEST_SENT` | Swap request notification |
| `SWAP_RESPONSE_RESULT` | Swap accepted/declined |
| `GAME_STARTED` | Game has begun |
| `GAME_STATE_UPDATE` | Game state changed |
| `PLAYER_DISCONNECTED` | Player lost connection |
| `PLAYER_RECONNECTED` | Player rejoined |
| `CARDS_REDISTRIBUTED` | Timeout expired, cards redistributed |
| `ERROR` | Error occurred |

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🙏 Acknowledgments

- Original Fish game from Bryn Mawr College's Distressing Math Collective
- Built with Next.js, React, Socket.IO, Firebase, and Tailwind CSS
- Inspired by classic card games and strategic thinking

**Happy Playing! 🐟**

