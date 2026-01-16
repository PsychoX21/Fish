const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const {
  dealCards,
  assignTeams,
  validateQuestion,
  validateClaim,
  getHalfSuit
} = require('./gameLogic');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

const generateRoomCode = () => {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
};

const getPlayerTeam = (gameState, playerId) => {
  return gameState.teams.A.includes(playerId) ? 'A' : 'B';
};

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('CREATE_ROOM', ({ playerName }) => {
    const code = generateRoomCode();
    
    const room = {
      code,
      players: [{
        id: socket.id,
        name: playerName,
        isHost: true
      }],
      gameState: null,
      hostId: socket.id
    };
    
    rooms.set(code, room);
    socket.join(code);
    
    socket.emit('ROOM_CREATED', { code, room });
    console.log(`Room created: ${code} by ${playerName}`);
  });

  socket.on('JOIN_ROOM', ({ code, playerName }) => {
    const room = rooms.get(code);
    
    if (!room) {
      socket.emit('ERROR', { message: 'Room not found' });
      return;
    }
    
    if (room.players.length >= 10) {
      socket.emit('ERROR', { message: 'Room is full' });
      return;
    }
    
    if (room.gameState) {
      socket.emit('ERROR', { message: 'Game already in progress' });
      return;
    }
    
    const player = {
      id: socket.id,
      name: playerName,
      isHost: false
    };
    
    room.players.push(player);
    socket.join(code);
    
    io.to(code).emit('PLAYER_JOINED', { room });
    console.log(`${playerName} joined room ${code}`);
  });

  socket.on('START_GAME', ({ code }) => {
    const room = rooms.get(code);
    
    if (!room) {
      socket.emit('ERROR', { message: 'Room not found' });
      return;
    }
    
    if (socket.id !== room.hostId) {
      socket.emit('ERROR', { message: 'Only host can start game' });
      return;
    }
    
    const numPlayers = room.players.length;
    
    if (numPlayers < 4 || numPlayers > 10 || numPlayers % 2 !== 0) {
      socket.emit('ERROR', { message: 'Need 4-10 players (even number)' });
      return;
    }
    
    const playerIds = room.players.map(p => p.id);
    const hands = dealCards(numPlayers);
    const handsById = {};
    playerIds.forEach((id, index) => {
      handsById[id] = hands[index];
    });
    
    room.gameState = {
      hands: handsById,
      teams: assignTeams(playerIds),
      currentPlayer: playerIds[0],
      claimedHalfSuits: { A: [], B: [] },
      gameLog: [],
      isPaused: false,
      pausedBy: null, // Track who paused
      lastQuestion: null,
      gameOver: false,
      winner: null
    };
    
    io.to(code).emit('GAME_STARTED', { room });
    console.log(`Game started in room ${code}`);
  });

  socket.on('ASK_CARD', ({ code, targetId, card }) => {
    const room = rooms.get(code);
    
    if (!room || !room.gameState) {
      socket.emit('ERROR', { message: 'Invalid game state' });
      return;
    }
    
    const gameState = room.gameState;
    
    if (gameState.isPaused) {
      socket.emit('ERROR', { message: 'Game is paused' });
      return;
    }
    
    if (gameState.currentPlayer !== socket.id) {
      socket.emit('ERROR', { message: 'Not your turn' });
      return;
    }
    
    const askerTeam = getPlayerTeam(gameState, socket.id);
    const targetTeam = getPlayerTeam(gameState, targetId);
    const askerHand = gameState.hands[socket.id];
    const targetHand = gameState.hands[targetId];
    
    const validation = validateQuestion(askerHand, card, targetId, askerTeam, targetTeam);
    
    if (!validation.isValid) {
      // Log illegal question
      gameState.gameLog.push({
        type: 'ILLEGAL_QUESTION',
        askerId: socket.id,
        targetId,
        card,
        reason: validation.reason,
        timestamp: Date.now()
      });
      
      gameState.currentPlayer = targetId;
      io.to(code).emit('GAME_STATE_UPDATE', { room });
      return;
    }
    
    const targetCardIndex = targetHand.findIndex(c => c.id === card.id);
    
    if (targetCardIndex !== -1) {
      // Transfer card - NO LOGGING (no history rule)
      const transferredCard = targetHand.splice(targetCardIndex, 1)[0];
      askerHand.push(transferredCard);
      
      // Asker continues, no log entry
    } else {
      // Card not found - NO LOGGING (no history rule)
      gameState.currentPlayer = targetId;
    }
    
    gameState.lastQuestion = { askerId: socket.id, targetId, card };
    io.to(code).emit('GAME_STATE_UPDATE', { room });
  });

  socket.on('MAKE_CLAIM', ({ code, halfSuit, distribution, targetTeam }) => {
    const room = rooms.get(code);
    
    if (!room || !room.gameState) {
      socket.emit('ERROR', { message: 'Invalid game state' });
      return;
    }
    
    const gameState = room.gameState;
    const claimerTeam = getPlayerTeam(gameState, socket.id);
    
    // Must be claimer's team turn
    if (!gameState.teams[claimerTeam].includes(gameState.currentPlayer)) {
      socket.emit('ERROR', { message: 'Can only claim during your team\'s turn' });
      return;
    }
    
    const validation = validateClaim(gameState, socket.id, halfSuit, distribution, targetTeam);
    
    if (validation.isValid) {
      // Successful claim - award to the team that actually has the cards
      gameState.claimedHalfSuits[validation.actualTeam].push(halfSuit);
      
      gameState.gameLog.push({
        type: 'CLAIM_SUCCESS',
        playerId: socket.id,
        claimerTeam,
        targetTeam: validation.actualTeam,
        halfSuit,
        timestamp: Date.now()
      });
      
      const totalClaimed = gameState.claimedHalfSuits.A.length + gameState.claimedHalfSuits.B.length;
      if (totalClaimed === 8) {
        gameState.gameOver = true;
        gameState.winner = gameState.claimedHalfSuits.A.length > gameState.claimedHalfSuits.B.length ? 'A' : 'B';
      }
    } else {
      // Failed claim - OTHER team gets it
      const beneficiaryTeam = claimerTeam === 'A' ? 'B' : 'A';
      gameState.claimedHalfSuits[beneficiaryTeam].push(halfSuit);
      
      gameState.gameLog.push({
        type: 'CLAIM_FAILED',
        playerId: socket.id,
        claimerTeam,
        halfSuit,
        reason: validation.reason,
        timestamp: Date.now()
      });
      
      const totalClaimed = gameState.claimedHalfSuits.A.length + gameState.claimedHalfSuits.B.length;
      if (totalClaimed === 8) {
        gameState.gameOver = true;
        gameState.winner = gameState.claimedHalfSuits.A.length > gameState.claimedHalfSuits.B.length ? 'A' : 'B';
      }
    }
    
    io.to(code).emit('GAME_STATE_UPDATE', { room });
  });

  // CORRECTED: Pause only during your team's turn
  socket.on('TOGGLE_PAUSE', ({ code }) => {
    const room = rooms.get(code);
    
    if (!room || !room.gameState) {
      socket.emit('ERROR', { message: 'Invalid game state' });
      return;
    }
    
    const gameState = room.gameState;
    const playerTeam = getPlayerTeam(gameState, socket.id);
    const currentPlayerTeam = getPlayerTeam(gameState, gameState.currentPlayer);
    
    // Can only pause/unpause during your team's turn
    if (playerTeam !== currentPlayerTeam) {
      socket.emit('ERROR', { message: 'Can only pause during your team\'s turn' });
      return;
    }
    
    if (gameState.isPaused) {
      // Unpause - any teammate can unpause
      gameState.isPaused = false;
      gameState.pausedBy = null;
    } else {
      // Pause
      gameState.isPaused = true;
      gameState.pausedBy = socket.id;
    }
    
    io.to(code).emit('GAME_STATE_UPDATE', { room });
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    
    rooms.forEach((room, code) => {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        
        if (room.players.length === 0) {
          rooms.delete(code);
          console.log(`Room ${code} deleted (empty)`);
        } else {
          if (socket.id === room.hostId && room.players.length > 0) {
            room.hostId = room.players[0].id;
            room.players[0].isHost = true;
          }
          
          io.to(code).emit('PLAYER_LEFT', { room });
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🐟 Fish Game Server running on port ${PORT}`);
});