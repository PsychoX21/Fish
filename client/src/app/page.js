'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import HomeScreen from '../components/HomeScreen';
import LobbyScreen from '../components/LobbyScreen';
import TeamSetupScreen from '../components/TeamSetupScreen';
import GameScreen from '../components/GameScreen';
import DisconnectOverlay from '../components/DisconnectOverlay';
import ProfileScreen from '../components/ProfileScreen';
import InviteOverlay from '../components/InviteOverlay';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
  const { socket, connected, emit, on } = useSocket();
  const { user, isAuthenticated } = useAuth();
  const [screen, setScreen] = useState('home');
  const [room, setRoom] = useState(null);
  const [teams, setTeams] = useState(null);
  const [swapRequests, setSwapRequests] = useState([]);
  const [disconnectInfo, setDisconnectInfo] = useState(null);
  const [pendingInvite, setPendingInvite] = useState(null);

  // Register user for online presence when connected
  useEffect(() => {
    if (socket && isAuthenticated && user?.uid) {
      emit('REGISTER_USER', { googleUid: user.uid });
    }
  }, [socket, isAuthenticated, user?.uid, emit]);

  useEffect(() => {
    if (!socket) return;

    const handlers = [
      on('ROOM_CREATED', ({ code, room }) => {
        setRoom(room);
        setScreen('lobby');
      }),

      on('PLAYER_JOINED', ({ room }) => {
        setRoom(room);
        setScreen('lobby');
      }),

      on('PLAYER_LEFT', ({ room }) => {
        setRoom(room);
      }),

      // New: Teams assigned -> go to team setup screen
      on('TEAMS_ASSIGNED', ({ room }) => {
        setRoom(room);
        setTeams(room.teamSetup.teams);
        setSwapRequests(room.teamSetup.swapRequests || []);
        setScreen('teamSetup');
      }),

      // Teams randomized
      on('TEAMS_UPDATED', ({ room }) => {
        setRoom(room);
        setTeams(room.teamSetup.teams);
        setSwapRequests(room.teamSetup.swapRequests || []);
      }),

      // Swap request sent
      on('SWAP_REQUEST_SENT', ({ room, request }) => {
        setRoom(room);
        setSwapRequests(room.teamSetup.swapRequests || []);
      }),

      // Swap response result
      on('SWAP_RESPONSE_RESULT', ({ room, request, accepted }) => {
        setRoom(room);
        setTeams(room.teamSetup.teams);
        setSwapRequests(room.teamSetup.swapRequests || []);
      }),

      on('GAME_STARTED', ({ room }) => {
        setRoom(room);
        setTeams(null);
        setSwapRequests([]);
        setScreen('game');
      }),

      on('GAME_STATE_UPDATE', ({ room }) => {
        setRoom(room);
      }),

      // Player rejoined an in-progress game (reconnection)
      on('GAME_REJOINED', ({ room }) => {
        setRoom(room);
        setTeams(null);
        setSwapRequests([]);
        setScreen('game');
      }),

      // Player disconnected - show overlay with countdown
      on('PLAYER_DISCONNECTED', ({ room, disconnectedPlayerId, disconnectedPlayerName, timeout }) => {
        setRoom(room);
        // Don't show overlay for yourself or if game is already over
        if (disconnectedPlayerId !== socket.id && !room.gameState?.gameOver) {
          setDisconnectInfo({
            playerName: disconnectedPlayerName,
            timeout: timeout
          });
        }
      }),

      // Player reconnected - hide overlay
      on('PLAYER_RECONNECTED', ({ room, reconnectedPlayerId }) => {
        setRoom(room);
        setDisconnectInfo(null);
      }),

      // Cards redistributed after timeout
      on('CARDS_REDISTRIBUTED', ({ room, removedPlayerId, removedPlayerName, cardsRedistributed }) => {
        setRoom(room);
        setDisconnectInfo(null);
        alert(`${removedPlayerName} timed out. Their ${cardsRedistributed} cards have been redistributed.`);
      }),

      // Navigation events
      on('LEFT_ROOM', () => {
        setRoom(null);
        setTeams(null);
        setSwapRequests([]);
        setDisconnectInfo(null);
        setScreen('home');
      }),

      on('ROOM_CLOSED', ({ reason, hostName }) => {
        alert(`Room closed: ${reason}`);
        setRoom(null);
        setTeams(null);
        setSwapRequests([]);
        setScreen('home');
      }),

      on('BACK_TO_LOBBY', ({ room }) => {
        setRoom(room);
        setTeams(null);
        setSwapRequests([]);
        setScreen('lobby');
      }),

      on('PLAYER_LEFT_GAME', ({ room, leftPlayerName, cardsRedistributed }) => {
        setRoom(room);
        alert(`${leftPlayerName} left the game. Their ${cardsRedistributed} cards have been redistributed.`);
      }),

      // Game invite received
      on('GAME_INVITE', ({ roomCode, fromName }) => {
        setPendingInvite({ roomCode, fromName });
      }),

      on('INVITE_SENT', ({ targetUid }) => {
        alert('Invite sent! They will be notified if they are online.');
      }),

      on('INVITE_FAILED', ({ reason }) => {
        alert(`Could not send invite: ${reason}`);
      }),

      // Play again - return to lobby
      on('PLAY_AGAIN', ({ room }) => {
        setRoom(room);
        setTeams(null);
        setSwapRequests([]);
        setDisconnectInfo(null);
        setScreen('lobby');
      })
    ];

    return () => {
      handlers.forEach(cleanup => cleanup && cleanup());
    };
  }, [socket, on]);

  const handleCreateRoom = (playerName, googleUid) => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    console.log('[DEBUG CLIENT] Creating room with photoURL:', user?.photoURL);
    emit('CREATE_ROOM', { playerName, googleUid, photoURL: user?.photoURL || null });
  };

  const handleJoinRoom = (code, playerName, googleUid) => {
    if (!playerName.trim() || !code.trim()) {
      alert('Please enter your name and room code');
      return;
    }
    console.log('[DEBUG CLIENT] Joining room with photoURL:', user?.photoURL);
    emit('JOIN_ROOM', { code: code.toUpperCase(), playerName, googleUid, photoURL: user?.photoURL || null });
  };

  const handleStartGame = () => {
    if (!room) return;
    emit('START_GAME', { code: room.code });
  };

  // Team setup handlers
  const handleRandomizeTeams = () => {
    if (!room) return;
    emit('RANDOMIZE_TEAMS', { code: room.code });
  };

  const handleSendSwapRequest = (targetId) => {
    if (!room) return;
    emit('SWAP_REQUEST', { code: room.code, targetId });
  };

  const handleRespondSwapRequest = (requestId, accept) => {
    if (!room) return;
    emit('SWAP_RESPONSE', { code: room.code, requestId, accept });
  };

  const handleConfirmTeams = () => {
    if (!room) return;
    emit('CONFIRM_TEAMS', { code: room.code });
  };

  const handleAskCard = (targetId, card) => {
    if (!room) return;
    emit('ASK_CARD', { code: room.code, targetId, card });
  };

  // CORRECTED: Include targetTeam parameter
  const handleMakeClaim = (halfSuit, distribution, targetTeam) => {
    if (!room) return;
    emit('MAKE_CLAIM', { code: room.code, halfSuit, distribution, targetTeam });
  };

  const handleTogglePause = () => {
    if (!room) return;
    emit('TOGGLE_PAUSE', { code: room.code });
  };

  // Navigation handlers
  const handleLeaveRoom = () => {
    if (!room) return;
    emit('LEAVE_ROOM', { code: room.code });
  };

  const handleDeclareWinner = (winningTeam) => {
    if (!room) return;
    emit('DECLARE_WINNER', { code: room.code, winningTeam });
  };

  const handleForceRedistribute = () => {
    if (!room) return;
    emit('FORCE_REDISTRIBUTE', { code: room.code });
  };

  const handleLeaveGame = () => {
    if (!room) return;

    // If game is over, no confirmation needed
    if (room.gameState?.gameOver) {
      emit('LEAVE_GAME', { code: room.code });
      return;
    }

    if (confirm('Are you sure you want to leave the game? Your cards will be redistributed to all remaining players.')) {
      emit('LEAVE_GAME', { code: room.code });
    }
  };

  const handleBackToLobby = () => {
    if (!room) return;
    emit('BACK_TO_LOBBY', { code: room.code });
  };

  // Invite handlers
  const handleInviteFriend = (targetUid) => {
    if (!room) return;
    const myPlayer = room.players.find(p => p.id === socket.id);
    emit('INVITE_TO_GAME', {
      targetUid,
      roomCode: room.code,
      fromName: myPlayer?.name || 'A friend'
    });
  };

  const handleAcceptInvite = () => {
    if (!pendingInvite) return;
    // Auto-join the room
    const playerName = user?.displayName || 'Player';
    emit('JOIN_ROOM', {
      code: pendingInvite.roomCode,
      playerName,
      googleUid: user?.uid
    });
    emit('INVITE_RESPONSE', {
      roomCode: pendingInvite.roomCode,
      accepted: true,
      googleUid: user?.uid
    });
    setPendingInvite(null);
  };

  const handleDeclineInvite = () => {
    if (pendingInvite && user?.uid) {
      emit('INVITE_RESPONSE', {
        roomCode: pendingInvite.roomCode,
        accepted: false,
        googleUid: user?.uid
      });
    }
    setPendingInvite(null);
  };

  const handlePlayAgain = () => {
    if (!room) return;
    emit('PLAY_AGAIN', { code: room.code });
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-4xl mb-4">🐟</div>
          <div className="text-xl font-semibold">Connecting to server...</div>
          <div className="text-sm mt-2 text-gray-300">
            Please wait while we establish a connection
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'home') {
    return (
      <>
        <HomeScreen
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onViewProfile={() => setScreen('profile')}
        />
        {pendingInvite && (
          <InviteOverlay
            invite={pendingInvite}
            onAccept={handleAcceptInvite}
            onDecline={handleDeclineInvite}
          />
        )}
      </>
    );
  }

  if (screen === 'profile') {
    return (
      <ProfileScreen
        onBack={() => setScreen('home')}
      />
    );
  }

  if (screen === 'lobby') {
    return (
      <>
        <LobbyScreen
          room={room}
          socket={socket}
          onStartGame={handleStartGame}
          onLeaveRoom={handleLeaveRoom}
          onInviteFriend={handleInviteFriend}
        />
        {pendingInvite && (
          <InviteOverlay
            invite={pendingInvite}
            onAccept={handleAcceptInvite}
            onDecline={handleDeclineInvite}
          />
        )}
      </>
    );
  }

  if (screen === 'teamSetup') {
    return (
      <TeamSetupScreen
        room={room}
        socket={socket}
        teams={teams}
        swapRequests={swapRequests}
        onSendSwapRequest={handleSendSwapRequest}
        onRespondSwapRequest={handleRespondSwapRequest}
        onConfirmTeams={handleConfirmTeams}
        onRandomizeTeams={handleRandomizeTeams}
        onLeaveRoom={handleLeaveRoom}
        onBackToLobby={handleBackToLobby}
      />
    );
  }

  if (screen === 'game') {
    return (
      <>
        <GameScreen
          room={room}
          socket={socket}
          onAskCard={handleAskCard}
          onMakeClaim={handleMakeClaim}
          onTogglePause={handleTogglePause}
          onLeaveGame={handleLeaveGame}
          onPlayAgain={handlePlayAgain}
          onDeclareWinner={handleDeclareWinner}
        />
        {disconnectInfo && (
          <DisconnectOverlay
            disconnectedPlayerName={disconnectInfo.playerName}
            timeout={disconnectInfo.timeout}
            isHost={room.players.find(p => p.id === socket.id)?.isHost}
            onForceRedistribute={handleForceRedistribute}
          />
        )}
      </>
    );
  }

  return null;
}