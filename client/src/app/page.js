'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import HomeScreen from '../components/HomeScreen';
import LobbyScreen from '../components/LobbyScreen';
import TeamSetupScreen from '../components/TeamSetupScreen';
import GameScreen from '../components/GameScreen';
import DisconnectOverlay from '../components/DisconnectOverlay';

export default function Home() {
  const { socket, connected, emit, on } = useSocket();
  const [screen, setScreen] = useState('home');
  const [room, setRoom] = useState(null);
  const [teams, setTeams] = useState(null);
  const [swapRequests, setSwapRequests] = useState([]);
  const [disconnectInfo, setDisconnectInfo] = useState(null);

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

      // Player disconnected - show overlay with countdown
      on('PLAYER_DISCONNECTED', ({ room, disconnectedPlayerId, disconnectedPlayerName, timeout }) => {
        setRoom(room);
        // Don't show overlay for yourself
        if (disconnectedPlayerId !== socket.id) {
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
    emit('CREATE_ROOM', { playerName, googleUid });
  };

  const handleJoinRoom = (code, playerName, googleUid) => {
    if (!playerName.trim() || !code.trim()) {
      alert('Please enter your name and room code');
      return;
    }
    emit('JOIN_ROOM', { code: code.toUpperCase(), playerName, googleUid });
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
      <HomeScreen
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
      />
    );
  }

  if (screen === 'lobby') {
    return (
      <LobbyScreen
        room={room}
        socket={socket}
        onStartGame={handleStartGame}
      />
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
        />
        {disconnectInfo && (
          <DisconnectOverlay
            disconnectedPlayerName={disconnectInfo.playerName}
            timeout={disconnectInfo.timeout}
          />
        )}
      </>
    );
  }

  return null;
}