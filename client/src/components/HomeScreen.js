import React, { useState } from 'react';
import { Crown } from 'lucide-react';

const HomeScreen = ({ onCreateRoom, onJoinRoom }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-full mb-4">
            <h1 className="text-3xl font-bold">🐟 FISH</h1>
          </div>
          <p className="text-gray-600">The Strategic Card Game</p>
        </div>

        <div className="space-y-4 mb-6">
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-teal-500 focus:outline-none transition"
          />
        </div>

        <div className="space-y-3">
          <button
            onClick={() => onCreateRoom(playerName)}
            disabled={!playerName}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            <Crown size={20} />
            Create Game Room
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-gray-500">or</span>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Room Code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-teal-500 focus:outline-none transition uppercase"
              maxLength={6}
            />
            <button
              onClick={() => onJoinRoom(roomCode, playerName)}
              disabled={!playerName || !roomCode}
              className="px-6 bg-teal-600 text-white py-3 rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeScreen;