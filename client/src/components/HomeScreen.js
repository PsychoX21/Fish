import React, { useState, useEffect } from 'react';
import { Crown, LogIn, LogOut, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const HomeScreen = ({ onCreateRoom, onJoinRoom, onViewProfile }) => {
  const { user, signInWithGoogle, signOut, isAuthenticated, loading } = useAuth();
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  // Auto-fill player name from Google account
  useEffect(() => {
    if (user?.displayName && !playerName) {
      setPlayerName(user.displayName);
    }
  }, [user]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      alert('Failed to sign in with Google. Please try again.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setPlayerName('');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-block bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full mb-3 sm:mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold">🐟 FISH</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600">The Strategic Card Game</p>
        </div>

        {/* Google Auth Section */}
        {!loading && (
          <div className="mb-6">
            {isAuthenticated ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl p-3">
                <button
                  onClick={onViewProfile}
                  className="flex items-center gap-3 hover:opacity-80 transition"
                >
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      className="w-10 h-10 rounded-full border-2 border-green-400"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <User size={20} className="text-white" />
                    </div>
                  )}
                  <div className="text-left">
                    <div className="font-semibold text-green-800 text-sm">{user?.displayName}</div>
                    <div className="text-xs text-green-600">View Profile →</div>
                  </div>
                </button>
                <button
                  onClick={handleSignOut}
                  className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Sign Out"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 bg-white border-2 border-gray-300 hover:border-gray-400 py-3 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign in with Google
              </button>
            )}
            {!isAuthenticated && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Sign in to save your stats and add friends
              </p>
            )}
          </div>
        )}

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
            onClick={() => onCreateRoom(playerName, user?.uid)}
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
              onClick={() => onJoinRoom(roomCode, playerName, user?.uid)}
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