import React, { useState, useEffect } from 'react';
import { Users, Copy, Check, Play, Crown, AlertCircle, LogOut, UserPlus, UserCheck } from 'lucide-react';
import { TEAM_COLORS } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';
import { getFriends, sendFriendRequest } from '../lib/ProfileService';
import FriendsPanel from './FriendsPanel';

const LobbyScreen = ({ room, socket, onStartGame, onLeaveRoom, onInviteFriend }) => {
  const { isAuthenticated, user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showFriends, setShowFriends] = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [sentFriendRequests, setSentFriendRequests] = useState(new Set());

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isHost = room.players.find(p => p.id === socket?.id)?.isHost;
  const canStart = room.players.length >= 4 &&
    room.players.length <= 10 &&
    room.players.length % 2 === 0;

  // Assign temporary visual teams for lobby display (alternating for preview)
  const getPreviewTeam = (index) => index % 2 === 0 ? 'A' : 'B';

  // Load friends list
  useEffect(() => {
    const loadFriends = async () => {
      if (isAuthenticated && user?.uid) {
        try {
          const friends = await getFriends(user.uid);
          setFriendsList(friends);
        } catch (err) {
          console.error('Error loading friends:', err);
        }
      }
    };
    loadFriends();
  }, [isAuthenticated, user?.uid]);

  // Helper to check if a player is a friend
  const isFriend = (playerGoogleUid) => friendsList.some(f => f.id === playerGoogleUid);

  // Handler for sending friend requests
  const handleSendFriendRequest = async (targetPlayer) => {
    if (!user?.uid || !targetPlayer.googleUid) return;
    try {
      await sendFriendRequest(user.uid, targetPlayer.googleUid);
      setSentFriendRequests(prev => new Set([...prev, targetPlayer.googleUid]));
    } catch (err) {
      console.error('Error sending friend request:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-4 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Game Lobby</h2>
            <div className="inline-flex items-center gap-2 bg-gray-100 px-4 sm:px-6 py-2 sm:py-3 rounded-full">
              <span className="text-gray-600">Room Code:</span>
              <span className="font-mono text-xl sm:text-2xl font-bold text-teal-600">{room.code}</span>
              <button
                onClick={copyRoomCode}
                className="ml-2 min-w-[44px] min-h-[44px] p-2 hover:bg-gray-200 active:bg-gray-300 rounded-lg transition"
              >
                {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
              </button>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="text-teal-600" />
              <h3 className="text-xl font-semibold">Players ({room.players.length}/10)</h3>
            </div>

            {/* Team Preview */}
            <div className="mb-4 flex justify-center gap-4 text-sm">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${TEAM_COLORS.A.bg} ${TEAM_COLORS.A.border} border-2`}>
                <div className={`w-3 h-3 rounded-full ${TEAM_COLORS.A.bgDark}`}></div>
                <span className={`font-semibold ${TEAM_COLORS.A.primary}`}>{TEAM_COLORS.A.name}</span>
              </div>
              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${TEAM_COLORS.B.bg} ${TEAM_COLORS.B.border} border-2`}>
                <div className={`w-3 h-3 rounded-full ${TEAM_COLORS.B.bgDark}`}></div>
                <span className={`font-semibold ${TEAM_COLORS.B.primary}`}>{TEAM_COLORS.B.name}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {room.players.map((player, index) => {
                const previewTeam = getPreviewTeam(index);
                return (
                  <div
                    key={player.id}
                    className={`bg-gradient-to-r ${previewTeam === 'A' ? 'from-red-50 to-rose-50 border-red-200' : 'from-blue-50 to-indigo-50 border-blue-200'} border-2 p-4 rounded-xl flex items-center gap-3`}
                  >
                    <div className={`w-10 h-10 ${TEAM_COLORS[previewTeam].avatar} text-white rounded-full flex items-center justify-center font-bold overflow-hidden`}>
                      {console.log('[DEBUG LOBBY] Player:', player.name, 'photoURL:', player.photoURL)}
                      {player.photoURL ? (
                        <img
                          src={player.photoURL}
                          alt={player.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to letter if image fails to load
                            console.log('[DEBUG] Image failed to load for:', player.name);
                            e.target.style.display = 'none';
                            e.target.parentElement.textContent = player.name[0].toUpperCase();
                          }}
                        />
                      ) : (
                        player.name[0].toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{player.name}</div>
                      {player.isHost && (
                        <div className="text-xs text-teal-600 flex items-center gap-1">
                          <Crown size={12} /> Host
                        </div>
                      )}
                    </div>
                    {/* Add Friend button for logged-in players */}
                    {isAuthenticated && player.googleUid && player.googleUid !== user?.uid && (
                      <>
                        {isFriend(player.googleUid) ? (
                          <span className="p-1.5 text-green-600" title="Friend">
                            <UserCheck size={16} />
                          </span>
                        ) : sentFriendRequests.has(player.googleUid) ? (
                          <span className="text-xs text-green-600">✓ Sent</span>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendFriendRequest(player);
                            }}
                            className="p-1.5 text-teal-600 hover:bg-teal-100 rounded-lg transition"
                            title="Add Friend"
                          >
                            <UserPlus size={16} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {!canStart && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
              <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-amber-800">
                Need 4-10 players (even number) to start the game. Currently: {room.players.length} player{room.players.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}

          {/* Invite Friends Button */}
          {isAuthenticated && (
            <button
              onClick={() => setShowFriends(true)}
              className="w-full min-h-[48px] bg-purple-100 hover:bg-purple-200 active:bg-purple-300 text-purple-700 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 mb-3"
            >
              <UserPlus size={20} />
              Invite Friends
            </button>
          )}

          {isHost && (
            <button
              onClick={onStartGame}
              disabled={!canStart}
              className="w-full min-h-[52px] bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-lg active:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 mb-3"
            >
              <Play size={24} />
              Start Game
            </button>
          )}

          <button
            onClick={() => {
              if (isHost) {
                if (confirm('This will close the room for all players. Are you sure?')) {
                  onLeaveRoom();
                }
              } else {
                onLeaveRoom();
              }
            }}
            className="w-full min-h-[48px] bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2"
          >
            <LogOut size={20} />
            {isHost ? 'Close Room' : 'Leave Room'}
          </button>
        </div>
      </div>

      {/* Friends Panel */}
      <FriendsPanel
        isOpen={showFriends}
        onClose={() => setShowFriends(false)}
        onInviteFriend={(friendId) => {
          onInviteFriend(friendId);
          setShowFriends(false);
        }}
        roomCode={room?.code}
      />
    </div>
  );
};

export default LobbyScreen;