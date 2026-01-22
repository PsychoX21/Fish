import React, { useState, useEffect } from 'react';
import { X, UserPlus, Search, Check, Clock, Users, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
    getFriends,
    getPendingRequests,
    sendFriendRequest,
    respondToFriendRequest,
    removeFriend,
    searchUsers
} from '../lib/ProfileService';

const FriendsPanel = ({ isOpen, onClose, onInviteFriend, roomCode }) => {
    const { user, isAuthenticated } = useAuth();
    const [friends, setFriends] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'requests', 'search'

    useEffect(() => {
        if (isOpen && isAuthenticated && user?.uid) {
            loadFriendsData();
        }
    }, [isOpen, isAuthenticated, user?.uid]);

    const loadFriendsData = async () => {
        setLoading(true);
        try {
            const [friendsList, requests] = await Promise.all([
                getFriends(user.uid),
                getPendingRequests(user.uid)
            ]);
            setFriends(friendsList);
            setPendingRequests(requests);
        } catch (error) {
            console.error('Error loading friends:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim() || searchQuery.length < 2) return;

        setSearching(true);
        try {
            const results = await searchUsers(searchQuery, user.uid, 10);
            setSearchResults(results);
        } catch (error) {
            console.error('Error searching users:', error);
        } finally {
            setSearching(false);
        }
    };

    const handleSendRequest = async (targetUid) => {
        try {
            await sendFriendRequest(user.uid, targetUid);
            setSearchResults(prev => prev.filter(u => u.id !== targetUid));
            alert('Friend request sent!');
        } catch (error) {
            console.error('Error sending friend request:', error);
        }
    };

    const handleRespondRequest = async (fromUid, accept) => {
        try {
            await respondToFriendRequest(user.uid, fromUid, accept);
            setPendingRequests(prev => prev.filter(r => r.fromUid !== fromUid));
            if (accept) {
                loadFriendsData(); // Refresh friends list
            }
        } catch (error) {
            console.error('Error responding to request:', error);
        }
    };

    const handleRemoveFriend = async (friendUid) => {
        if (!confirm('Are you sure you want to remove this friend?')) return;

        try {
            await removeFriend(user.uid, friendUid);
            setFriends(prev => prev.filter(f => f.id !== friendUid));
        } catch (error) {
            console.error('Error removing friend:', error);
        }
    };

    const handleInvite = (friendId, friendName) => {
        if (onInviteFriend) {
            onInviteFriend(friendId, friendName);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
            <div
                className="bg-white w-full max-w-md h-full shadow-2xl animate-[slideInRight_0.3s_ease-out] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white p-4">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Users size={24} />
                            Friends
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('friends')}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${activeTab === 'friends'
                                    ? 'bg-white text-teal-600'
                                    : 'bg-white/20 text-white hover:bg-white/30'
                                }`}
                        >
                            Friends ({friends.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('requests')}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition relative ${activeTab === 'requests'
                                    ? 'bg-white text-teal-600'
                                    : 'bg-white/20 text-white hover:bg-white/30'
                                }`}
                        >
                            Requests
                            {pendingRequests.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                    {pendingRequests.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('search')}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${activeTab === 'search'
                                    ? 'bg-white text-teal-600'
                                    : 'bg-white/20 text-white hover:bg-white/30'
                                }`}
                        >
                            <Search size={16} className="mx-auto" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="animate-spin text-teal-500" size={32} />
                        </div>
                    ) : (
                        <>
                            {/* Friends Tab */}
                            {activeTab === 'friends' && (
                                <div className="space-y-3">
                                    {friends.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <Users size={48} className="mx-auto mb-3 text-gray-300" />
                                            <p>No friends yet!</p>
                                            <p className="text-sm">Search for players to add.</p>
                                        </div>
                                    ) : (
                                        friends.map((friend) => (
                                            <div
                                                key={friend.id}
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {friend.photoURL ? (
                                                        <img
                                                            src={friend.photoURL}
                                                            alt={friend.displayName}
                                                            className="w-10 h-10 rounded-full"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold">
                                                            {friend.displayName?.[0]?.toUpperCase() || '?'}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-semibold text-gray-800">
                                                            {friend.displayName}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {friend.stats?.gamesPlayed || 0} games • {friend.stats?.winRate || 0}% win rate
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    {roomCode && (
                                                        <button
                                                            onClick={() => handleInvite(friend.id, friend.displayName)}
                                                            className="px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-lg transition"
                                                        >
                                                            Invite
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleRemoveFriend(friend.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                                        title="Remove friend"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Requests Tab */}
                            {activeTab === 'requests' && (
                                <div className="space-y-3">
                                    {pendingRequests.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <Clock size={48} className="mx-auto mb-3 text-gray-300" />
                                            <p>No pending requests</p>
                                        </div>
                                    ) : (
                                        pendingRequests.map((request) => (
                                            <div
                                                key={request.fromUid}
                                                className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {request.senderPhoto ? (
                                                        <img
                                                            src={request.senderPhoto}
                                                            alt={request.senderName}
                                                            className="w-10 h-10 rounded-full"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold">
                                                            {request.senderName?.[0]?.toUpperCase() || '?'}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-semibold text-gray-800">
                                                            {request.senderName}
                                                        </div>
                                                        <div className="text-xs text-amber-600">
                                                            Wants to be your friend
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleRespondRequest(request.fromUid, true)}
                                                        className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition"
                                                        title="Accept"
                                                    >
                                                        <Check size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRespondRequest(request.fromUid, false)}
                                                        className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
                                                        title="Decline"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}

                            {/* Search Tab */}
                            {activeTab === 'search' && (
                                <div>
                                    <div className="flex gap-2 mb-4">
                                        <input
                                            type="text"
                                            placeholder="Search by name..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                            className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-teal-500 focus:outline-none transition"
                                        />
                                        <button
                                            onClick={handleSearch}
                                            disabled={searching}
                                            className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-medium transition disabled:opacity-50"
                                        >
                                            {searching ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {searchResults.length === 0 && searchQuery && !searching && (
                                            <div className="text-center py-4 text-gray-500">
                                                No users found
                                            </div>
                                        )}

                                        {searchResults.map((result) => (
                                            <div
                                                key={result.id}
                                                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {result.photoURL ? (
                                                        <img
                                                            src={result.photoURL}
                                                            alt={result.displayName}
                                                            className="w-10 h-10 rounded-full"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold">
                                                            {result.displayName?.[0]?.toUpperCase() || '?'}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-semibold text-gray-800">
                                                            {result.displayName}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {result.stats?.gamesPlayed || 0} games played
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleSendRequest(result.id)}
                                                    className="flex items-center gap-1 px-3 py-1.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-medium rounded-lg transition"
                                                >
                                                    <UserPlus size={14} />
                                                    Add
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FriendsPanel;
