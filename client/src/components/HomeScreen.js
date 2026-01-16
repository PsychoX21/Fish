import React, { useState } from 'react';
import { Crown } from 'lucide-react';

const HomeScreen = ({ onCreateRoom, onJoinRoom }) => {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-block bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full mb-3 sm:mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold">🐟 FISH</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600">The Strategic Card Game</p>
        </div>

        <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-xl focus:border-teal-500 focus:outline-none transition text-sm sm:text-base"
          />
        </div>

        <div className="space-y-3">
          <button
            onClick={() => onCreateRoom(playerName)}
            disabled={!playerName}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-2.5 sm:py-3 rounded-xl font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <Crown size={18} className="sm:w-5 sm:h-5" />
            Create Game Room
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-xs sm:text-sm">
              <span className="px-3 sm:px-4 bg-white text-gray-500">or</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="Room Code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full sm:flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-gray-300 rounded-xl focus:border-teal-500 focus:outline-none transition uppercase text-center sm:text-left text-sm sm:text-base"
              maxLength={6}
            />
            <button
              onClick={() => onJoinRoom(roomCode, playerName)}
              disabled={!playerName || !roomCode}
              className="w-full sm:w-auto px-6 sm:px-8 bg-teal-600 text-white py-2.5 sm:py-3 rounded-xl font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm sm:text-base whitespace-nowrap"
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