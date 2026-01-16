'use client';

import React, { useState, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';
import HomeScreen from '../components/HomeScreen';
import LobbyScreen from '../components/LobbyScreen';
import GameScreen from '../components/GameScreen';

export default function Home() {
  const { socket, connected, emit, on } = useSocket();
  const [screen, setScreen] = useState('home');
  const [room, setRoom] = useState(null);

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

      on('GAME_STARTED', ({ room }) => {
        setRoom(room);
        setScreen('game');
      }),

      on('GAME_STATE_UPDATE', ({ room }) => {
        setRoom(room);
      })
    ];

    return () => {
      handlers.forEach(cleanup => cleanup && cleanup());
    };
  }, [socket, on]);

  const handleCreateRoom = (playerName) => {
    if (!playerName.trim()) {
      alert('Please enter your name');
      return;
    }
    emit('CREATE_ROOM', { playerName });
  };

  const handleJoinRoom = (code, playerName) => {
    if (!playerName.trim() || !code.trim()) {
      alert('Please enter your name and room code');
      return;
    }
    emit('JOIN_ROOM', { code: code.toUpperCase(), playerName });
  };

  const handleStartGame = () => {
    if (!room) return;
    emit('START_GAME', { code: room.code });
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
            Make sure the backend server is running on port 3001
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

  if (screen === 'game') {
    return (
      <GameScreen
        room={room}
        socket={socket}
        onAskCard={handleAskCard}
        onMakeClaim={handleMakeClaim}
        onTogglePause={handleTogglePause}
      />
    );
  }

  return null;
}