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
const disconnectedPlayers = new Map(); // Track disconnected players by googleUid
const RECONNECT_TIMEOUT = 60000; // 60 seconds

const generateRoomCode = () => {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
};

const getPlayerTeam = (gameState, playerId) => {
  return gameState.teams.A.includes(playerId) ? 'A' : 'B';
};

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  socket.on('CREATE_ROOM', ({ playerName, googleUid }) => {
    const code = generateRoomCode();

    const room = {
      code,
      players: [{
        id: socket.id,
        name: playerName,
        isHost: true,
        googleUid: googleUid || null,
        disconnected: false
      }],
      gameState: null,
      hostId: socket.id,
      disconnectTimers: {} // Track disconnect timers by player id
    };

    rooms.set(code, room);
    socket.join(code);

    socket.emit('ROOM_CREATED', { code, room });
    console.log(`Room created: ${code} by ${playerName}`);
  });

  socket.on('JOIN_ROOM', ({ code, playerName, googleUid }) => {
    const room = rooms.get(code);

    if (!room) {
      socket.emit('ERROR', { message: 'Room not found' });
      return;
    }

    // Check if this is a reconnecting player (by googleUid)
    if (googleUid && room.gameState) {
      const disconnectedPlayer = room.players.find(
        p => p.googleUid === googleUid && p.disconnected
      );

      if (disconnectedPlayer) {
        // Clear timeout
        if (room.disconnectTimers[disconnectedPlayer.id]) {
          clearTimeout(room.disconnectTimers[disconnectedPlayer.id]);
          delete room.disconnectTimers[disconnectedPlayer.id];
        }

        const oldId = disconnectedPlayer.id;

        // Update player id to new socket
        disconnectedPlayer.id = socket.id;
        disconnectedPlayer.disconnected = false;

        // Update gameState references
        if (room.gameState.hands[oldId]) {
          room.gameState.hands[socket.id] = room.gameState.hands[oldId];
          delete room.gameState.hands[oldId];
        }

        // Update team references
        room.gameState.teams.A = room.gameState.teams.A.map(id => id === oldId ? socket.id : id);
        room.gameState.teams.B = room.gameState.teams.B.map(id => id === oldId ? socket.id : id);

        // Update current player if needed
        if (room.gameState.currentPlayer === oldId) {
          room.gameState.currentPlayer = socket.id;
        }

        socket.join(code);

        io.to(code).emit('PLAYER_RECONNECTED', { room, reconnectedPlayerId: socket.id });
        console.log(`${playerName} reconnected to room ${code}`);
        return;
      }
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
      isHost: false,
      googleUid: googleUid || null,
      disconnected: false
    };

    room.players.push(player);
    socket.join(code);

    io.to(code).emit('PLAYER_JOINED', { room });
    console.log(`${playerName} joined room ${code}`);
  });

  // Step 1: Host clicks Start -> Randomize teams and go to team setup
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

    // Initialize team setup state (not game state yet)
    room.teamSetup = {
      teams: assignTeams(playerIds),
      swapRequests: [],
      nextRequestId: 1
    };

    io.to(code).emit('TEAMS_ASSIGNED', { room });
    console.log(`Teams assigned in room ${code}`);
  });

  // Randomize teams again
  socket.on('RANDOMIZE_TEAMS', ({ code }) => {
    const room = rooms.get(code);

    if (!room || !room.teamSetup) {
      socket.emit('ERROR', { message: 'Invalid room state' });
      return;
    }

    if (socket.id !== room.hostId) {
      socket.emit('ERROR', { message: 'Only host can randomize teams' });
      return;
    }

    const playerIds = room.players.map(p => p.id);
    room.teamSetup.teams = assignTeams(playerIds);
    room.teamSetup.swapRequests = []; // Clear pending requests

    io.to(code).emit('TEAMS_UPDATED', { room });
    console.log(`Teams randomized in room ${code}`);
  });

  // Send swap request
  socket.on('SWAP_REQUEST', ({ code, targetId }) => {
    const room = rooms.get(code);

    if (!room || !room.teamSetup) {
      socket.emit('ERROR', { message: 'Invalid room state' });
      return;
    }

    const teams = room.teamSetup.teams;
    const fromTeam = teams.A.includes(socket.id) ? 'A' : 'B';
    const targetTeam = teams.A.includes(targetId) ? 'A' : 'B';

    // Can only swap with opposite team
    if (fromTeam === targetTeam) {
      socket.emit('ERROR', { message: 'Can only swap with opposite team members' });
      return;
    }

    // Check if already has pending request
    const existingRequest = room.teamSetup.swapRequests.find(
      r => r.fromId === socket.id && r.status === 'pending'
    );
    if (existingRequest) {
      socket.emit('ERROR', { message: 'You already have a pending swap request' });
      return;
    }

    const request = {
      id: room.teamSetup.nextRequestId++,
      fromId: socket.id,
      targetId: targetId,
      status: 'pending',
      timestamp: Date.now()
    };

    room.teamSetup.swapRequests.push(request);

    io.to(code).emit('SWAP_REQUEST_SENT', { room, request });
    console.log(`Swap request sent in room ${code}`);
  });

  // Respond to swap request
  socket.on('SWAP_RESPONSE', ({ code, requestId, accept }) => {
    const room = rooms.get(code);

    if (!room || !room.teamSetup) {
      socket.emit('ERROR', { message: 'Invalid room state' });
      return;
    }

    const request = room.teamSetup.swapRequests.find(r => r.id === requestId);

    if (!request) {
      socket.emit('ERROR', { message: 'Request not found' });
      return;
    }

    if (request.targetId !== socket.id) {
      socket.emit('ERROR', { message: 'You cannot respond to this request' });
      return;
    }

    if (request.status !== 'pending') {
      socket.emit('ERROR', { message: 'Request already responded to' });
      return;
    }

    if (accept) {
      // Perform the swap
      const teams = room.teamSetup.teams;
      const fromId = request.fromId;
      const targetId = request.targetId;

      // Check which team each player is in BEFORE modifying
      const fromTeam = teams.A.includes(fromId) ? 'A' : 'B';
      const targetTeam = teams.A.includes(targetId) ? 'A' : 'B';

      if (fromTeam !== targetTeam) {
        // Remove both players from their current teams
        teams[fromTeam] = teams[fromTeam].filter(id => id !== fromId);
        teams[targetTeam] = teams[targetTeam].filter(id => id !== targetId);

        // Add them to opposite teams
        teams[fromTeam].push(targetId);
        teams[targetTeam].push(fromId);
      }

      request.status = 'accepted';
    } else {
      request.status = 'declined';
    }

    io.to(code).emit('SWAP_RESPONSE_RESULT', { room, request, accepted: accept });
    console.log(`Swap request ${accept ? 'accepted' : 'declined'} in room ${code}`);
  });

  // Confirm teams and actually start the game
  socket.on('CONFIRM_TEAMS', ({ code }) => {
    const room = rooms.get(code);

    if (!room || !room.teamSetup) {
      socket.emit('ERROR', { message: 'Invalid room state' });
      return;
    }

    if (socket.id !== room.hostId) {
      socket.emit('ERROR', { message: 'Only host can confirm teams' });
      return;
    }

    const numPlayers = room.players.length;
    const playerIds = room.players.map(p => p.id);
    const hands = dealCards(numPlayers);
    const handsById = {};
    playerIds.forEach((id, index) => {
      handsById[id] = hands[index];
    });

    room.gameState = {
      hands: handsById,
      teams: room.teamSetup.teams, // Use the confirmed teams
      currentPlayer: playerIds[0],
      claimedHalfSuits: { A: [], B: [] },
      gameLog: [],
      isPaused: false,
      pausedBy: null,
      lastQuestion: null,
      lastTransaction: null,
      gameOver: false,
      winner: null
    };

    // Clear team setup state
    delete room.teamSetup;

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
      const transferredCard = targetHand.splice(targetCardIndex, 1)[0];
      askerHand.push(transferredCard);

      gameState.lastTransaction = {
        type: 'CARD_GIVEN',
        askerId: socket.id,
        targetId,
        card: transferredCard,
        timestamp: Date.now()
      };
    } else {
      gameState.lastTransaction = {
        type: 'CARD_NOT_FOUND',
        askerId: socket.id,
        targetId,
        card,
        timestamp: Date.now()
      };

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

      const [suit, type] = halfSuit.split('-');
      const cardList = type === 'low' ? LOW_CARDS : HIGH_CARDS;
      const claimedCardIds = cardList.map(value => `${value}-${suit}`);

      Object.keys(gameState.hands).forEach(playerId => {
        gameState.hands[playerId] = gameState.hands[playerId].filter(
          card => !claimedCardIds.includes(card.id)
        );
      });

      gameState.gameLog.push({
        type: 'CLAIM_SUCCESS',
        playerId: socket.id,
        claimerTeam,
        targetTeam: validation.actualTeam,
        halfSuit,
        timestamp: Date.now()
      });

      gameState.lastTransaction = {
        type: 'CLAIM_SUCCESS',
        playerId: socket.id,
        claimerTeam,
        awardedTeam: validation.actualTeam,
        halfSuit,
        timestamp: Date.now()
      };

      const totalClaimed = gameState.claimedHalfSuits.A.length + gameState.claimedHalfSuits.B.length;
      if (totalClaimed === 8) {
        gameState.gameOver = true;
        gameState.winner = gameState.claimedHalfSuits.A.length > gameState.claimedHalfSuits.B.length ? 'A' : 'B';
      }
    } else {
      // Failed claim - OTHER team gets it
      const beneficiaryTeam = claimerTeam === 'A' ? 'B' : 'A';
      gameState.claimedHalfSuits[beneficiaryTeam].push(halfSuit);

      const [suit, type] = halfSuit.split('-');
      const cardList = type === 'low' ? LOW_CARDS : HIGH_CARDS;
      const claimedCardIds = cardList.map(value => `${value}-${suit}`);

      Object.keys(gameState.hands).forEach(playerId => {
        gameState.hands[playerId] = gameState.hands[playerId].filter(
          card => !claimedCardIds.includes(card.id)
        );
      });

      gameState.gameLog.push({
        type: 'CLAIM_FAILED',
        playerId: socket.id,
        claimerTeam,
        halfSuit,
        reason: validation.reason,
        timestamp: Date.now()
      });

      gameState.lastTransaction = {
        type: 'CLAIM_FAILED',
        playerId: socket.id,
        claimerTeam,
        awardedTeam: beneficiaryTeam,
        halfSuit,
        timestamp: Date.now()
      };

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
        const player = room.players[playerIndex];

        // If game is in progress and player has googleUid, allow reconnection
        if (room.gameState && player.googleUid) {
          // Mark player as disconnected but don't remove
          player.disconnected = true;

          // Pause game for reconnection
          room.gameState.isPaused = true;
          room.gameState.pausedBy = socket.id;
          room.gameState.disconnectedPlayer = {
            id: player.id,
            name: player.name,
            disconnectTime: Date.now()
          };

          io.to(code).emit('PLAYER_DISCONNECTED', {
            room,
            disconnectedPlayerId: player.id,
            disconnectedPlayerName: player.name,
            timeout: RECONNECT_TIMEOUT
          });

          console.log(`${player.name} disconnected from game in room ${code}, waiting for reconnection...`);

          // Start reconnection timeout
          room.disconnectTimers[player.id] = setTimeout(() => {
            // Timeout expired - redistribute cards
            console.log(`Reconnection timeout expired for ${player.name} in room ${code}`);

            const gameState = room.gameState;
            if (!gameState) return;

            const disconnectedCards = gameState.hands[player.id] || [];
            delete gameState.hands[player.id];

            // Get active players on the same team
            const playerTeam = gameState.teams.A.includes(player.id) ? 'A' : 'B';
            const activeTeammates = room.players.filter(p =>
              !p.disconnected &&
              p.id !== player.id &&
              gameState.teams[playerTeam].includes(p.id)
            );

            // If no active teammates, distribute to all active players
            const recipients = activeTeammates.length > 0
              ? activeTeammates
              : room.players.filter(p => !p.disconnected && p.id !== player.id);

            // Redistribute cards evenly
            if (recipients.length > 0 && disconnectedCards.length > 0) {
              disconnectedCards.forEach((card, index) => {
                const recipient = recipients[index % recipients.length];
                if (!gameState.hands[recipient.id]) {
                  gameState.hands[recipient.id] = [];
                }
                gameState.hands[recipient.id].push(card);
              });
            }

            // Remove from teams
            gameState.teams.A = gameState.teams.A.filter(id => id !== player.id);
            gameState.teams.B = gameState.teams.B.filter(id => id !== player.id);

            // Update current player if needed
            if (gameState.currentPlayer === player.id) {
              const activePlayers = room.players.filter(p => !p.disconnected);
              if (activePlayers.length > 0) {
                gameState.currentPlayer = activePlayers[0].id;
              }
            }

            // Remove player from room
            room.players = room.players.filter(p => p.id !== player.id);

            // Unpause game
            gameState.isPaused = false;
            gameState.pausedBy = null;
            delete gameState.disconnectedPlayer;

            // Update host if needed
            if (socket.id === room.hostId && room.players.length > 0) {
              room.hostId = room.players[0].id;
              room.players[0].isHost = true;
            }

            delete room.disconnectTimers[player.id];

            io.to(code).emit('CARDS_REDISTRIBUTED', {
              room,
              removedPlayerId: player.id,
              removedPlayerName: player.name,
              cardsRedistributed: disconnectedCards.length
            });

            console.log(`Cards redistributed for ${player.name} in room ${code}`);
          }, RECONNECT_TIMEOUT);

        } else {
          // No googleUid - cannot reconnect
          // But if game is in progress, redistribute cards immediately
          if (room.gameState) {
            const gameState = room.gameState;
            const disconnectedCards = gameState.hands[player.id] || [];
            delete gameState.hands[player.id];

            // Get active players on the same team
            const playerTeam = gameState.teams.A.includes(player.id) ? 'A' : 'B';
            const activeTeammates = room.players.filter(p =>
              p.id !== player.id &&
              gameState.teams[playerTeam].includes(p.id)
            );

            // If no active teammates, distribute to all active players
            const recipients = activeTeammates.length > 0
              ? activeTeammates
              : room.players.filter(p => p.id !== player.id);

            // Redistribute cards evenly
            if (recipients.length > 0 && disconnectedCards.length > 0) {
              disconnectedCards.forEach((card, index) => {
                const recipient = recipients[index % recipients.length];
                if (!gameState.hands[recipient.id]) {
                  gameState.hands[recipient.id] = [];
                }
                gameState.hands[recipient.id].push(card);
              });
            }

            // Remove from teams
            gameState.teams.A = gameState.teams.A.filter(id => id !== player.id);
            gameState.teams.B = gameState.teams.B.filter(id => id !== player.id);

            // Update current player if needed
            if (gameState.currentPlayer === player.id) {
              const remainingPlayers = room.players.filter(p => p.id !== player.id);
              if (remainingPlayers.length > 0) {
                gameState.currentPlayer = remainingPlayers[0].id;
              }
            }

            // Remove player from room
            room.players = room.players.filter(p => p.id !== player.id);

            // Update host if needed
            if (socket.id === room.hostId && room.players.length > 0) {
              room.hostId = room.players[0].id;
              room.players[0].isHost = true;
            }

            io.to(code).emit('CARDS_REDISTRIBUTED', {
              room,
              removedPlayerId: player.id,
              removedPlayerName: player.name,
              cardsRedistributed: disconnectedCards.length
            });

            console.log(`Cards redistributed immediately for non-logged-in player ${player.name} in room ${code}`);
          } else {
            // No game in progress - just remove player
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
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`🐟 Fish Game Server running on port ${PORT}`);
});