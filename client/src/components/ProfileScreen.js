import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Target, TrendingUp, Clock, User, Camera, Check, Users, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getOrCreateProfile, getGameHistory, updateAvatar, sendFriendRequest, uploadAvatar, updateUserAvatar } from '../lib/ProfileService';
import { db } from '../lib/firebaseConfig';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { TEAM_COLORS } from '../lib/constants';
import FriendsPanel from './FriendsPanel';

// Preset avatars for selection
const PRESET_AVATARS = [
    { id: 'fish1', emoji: '🐟', bg: 'bg-blue-500' },
    { id: 'fish2', emoji: '🐠', bg: 'bg-cyan-500' },
    { id: 'fish3', emoji: '🐡', bg: 'bg-teal-500' },
    { id: 'shark', emoji: '🦈', bg: 'bg-gray-600' },
    { id: 'octopus', emoji: '🐙', bg: 'bg-purple-500' },
    { id: 'crab', emoji: '🦀', bg: 'bg-red-500' },
    { id: 'whale', emoji: '🐋', bg: 'bg-indigo-500' },
    { id: 'dolphin', emoji: '🐬', bg: 'bg-blue-400' },
];

const ProfileScreen = ({ onBack }) => {
    const { user } = useAuth();
    const [profile, setProfile] = useState(null);
    const [gameHistory, setGameHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAvatarPicker, setShowAvatarPicker] = useState(false);
    const [selectedAvatar, setSelectedAvatar] = useState(null);
    const [expandedGame, setExpandedGame] = useState(null);
    const [sentRequests, setSentRequests] = useState(new Set());
    const [showFriendsPanel, setShowFriendsPanel] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewURL, setPreviewURL] = useState(null);
    const [editingName, setEditingName] = useState(false);
    const [newDisplayName, setNewDisplayName] = useState('');

    useEffect(() => {
        const loadProfile = async () => {
            if (!user) {
                setLoading(false);
                return;
            }

            try {
                const profileData = await getOrCreateProfile(user);
                setProfile(profileData);

                // Set current avatar selection
                if (profileData?.customAvatar) {
                    setSelectedAvatar(profileData.customAvatar);
                }

                const history = await getGameHistory(user.uid, 10);
                setGameHistory(history);
            } catch (error) {
                console.error('Error loading profile:', error);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [user]);

    const handleSelectAvatar = async (avatarId) => {
        setSelectedAvatar(avatarId);
        try {
            // Save emoji preset ID to Firestore as customAvatar
            await updateUserAvatar(user.uid, avatarId, 'custom');
            setProfile({ ...profile, customAvatar: avatarId, avatarType: 'custom' });
            setShowAvatarPicker(false);
        } catch (error) {
            console.error('Error updating avatar:', error);
        }
    };

    const handleFileSelect = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file size (2MB for base64 compression)
        if (file.size > 2 * 1024 * 1024) {
            alert('File size must be less than 2MB');
            return;
        }

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            alert('Only JPG, PNG, and WebP images are allowed');
            return;
        }

        setSelectedFile(file);

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewURL(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleUploadAvatar = async () => {
        if (!selectedFile || !user?.uid) return;

        setUploadingAvatar(true);
        setUploadProgress(0);

        try {
            // Compress and convert to base64
            setUploadProgress(30);

            const avatarBase64 = await uploadAvatar(selectedFile, user.uid);

            setUploadProgress(70);

            // Update Firestore profile with base64 data
            await updateUserAvatar(user.uid, avatarBase64, 'custom');

            setUploadProgress(100);

            // Update local state
            setProfile({ ...profile, customAvatar: avatarBase64, avatarType: 'custom' });

            // Clear selection
            setSelectedFile(null);
            setPreviewURL(null);
            setShowAvatarPicker(false);

            alert('Avatar uploaded successfully!');
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert('Failed to upload avatar: ' + error.message);
        } finally {
            setUploadingAvatar(false);
            setUploadProgress(0);
        }
    };

    const getAvatarDisplay = () => {
        // Priority 1: Custom uploaded avatar (base64) or emoji preset
        if (profile?.customAvatar) {
            // Check if it's an emoji preset ID
            const preset = PRESET_AVATARS.find(a => a.id === profile.customAvatar);
            if (preset) {
                return (
                    <div className={`w-24 h-24 sm:w-32 sm:h-32 ${preset.bg} rounded-full flex items-center justify-center text-5xl sm:text-6xl`}>
                        {preset.emoji}
                    </div>
                );
            }
            // Otherwise it's a base64 image
            return (
                <img
                    src={profile.customAvatar}
                    alt={profile.displayName}
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-teal-400 object-cover"
                />
            );
        }

        // Priority 2: Google photo
        if (profile?.photoURL || user?.photoURL) {
            return (
                <img
                    src={profile?.photoURL || user.photoURL}
                    alt={profile?.displayName || user.displayName}
                    className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-teal-400 object-cover"
                />
            );
        }

        return (
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-teal-500 rounded-full flex items-center justify-center">
                <User size={48} className="text-white" />
            </div>
        );
    };

    const formatDate = (date) => {
        if (!date) return 'Unknown';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const handleSendFriendRequest = async (targetUid, targetName) => {
        try {
            await sendFriendRequest(user.uid, targetUid);
            setSentRequests(prev => new Set([...prev, targetUid]));
            alert(`Friend request sent to ${targetName}!`);
        } catch (err) {
            console.error('Error sending friend request:', err);
            alert('Failed to send request');
        }
    };

    const handleUpdateDisplayName = async () => {
        if (!newDisplayName.trim() || !user?.uid) return;

        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                displayName: newDisplayName.trim(),
                updatedAt: serverTimestamp()
            });

            setProfile({ ...profile, displayName: newDisplayName.trim() });
            setEditingName(false);
            alert('Display name updated successfully!');
        } catch (error) {
            console.error('Error updating display name:', error);
            alert('Failed to update name: ' + error.message);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 flex items-center justify-center">
                <div className="text-white text-center">
                    <div className="text-4xl mb-4">🐟</div>
                    <div className="text-xl font-semibold">Loading profile...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 p-4">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-4 sm:p-8 mb-4">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 transition"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-medium">Back to Home</span>
                    </button>

                    {/* Profile Header */}
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-6">
                        <div className="relative">
                            {getAvatarDisplay()}
                            <button
                                onClick={() => setShowAvatarPicker(true)}
                                className="absolute bottom-0 right-0 w-8 h-8 bg-teal-500 hover:bg-teal-600 text-white rounded-full flex items-center justify-center shadow-lg transition"
                                title="Change avatar"
                            >
                                <Camera size={16} />
                            </button>
                        </div>

                        <div className="text-center sm:text-left flex-1">
                            {editingName ? (
                                <div className="flex items-center gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={newDisplayName}
                                        onChange={(e) => setNewDisplayName(e.target.value)}
                                        className="text-2xl sm:text-3xl font-bold text-gray-800 border-2 border-teal-500 rounded-lg px-3 py-1 flex-1"
                                        placeholder="Enter display name"
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleUpdateDisplayName}
                                        className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition"
                                        title="Save"
                                    >
                                        <Check size={20} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditingName(false);
                                            setNewDisplayName('');
                                        }}
                                        className="p-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg transition"
                                        title="Cancel"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 mb-2">
                                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
                                        {profile?.displayName || user?.displayName}
                                    </h1>
                                    <button
                                        onClick={() => {
                                            setNewDisplayName(profile?.displayName || user?.displayName || '');
                                            setEditingName(true);
                                        }}
                                        className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition"
                                        title="Edit name"
                                    >
                                        ✏️
                                    </button>
                                </div>
                            )}
                            <p className="text-gray-600">{user?.email}</p>
                            <p className="text-sm text-gray-500 mt-1">
                                Member since {formatDate(profile?.createdAt?.toDate?.() || new Date())}
                            </p>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        <div className="bg-gradient-to-br from-teal-50 to-emerald-50 p-4 rounded-xl border border-teal-200">
                            <div className="flex items-center gap-2 text-teal-600 mb-1">
                                <Target size={18} />
                                <span className="text-sm font-medium">Games</span>
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold text-gray-800">
                                {profile?.stats?.gamesPlayed || 0}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                            <div className="flex items-center gap-2 text-green-600 mb-1">
                                <Trophy size={18} />
                                <span className="text-sm font-medium">Wins</span>
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold text-gray-800">
                                {profile?.stats?.wins || 0}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-red-50 to-rose-50 p-4 rounded-xl border border-red-200">
                            <div className="flex items-center gap-2 text-red-600 mb-1">
                                <Target size={18} />
                                <span className="text-sm font-medium">Losses</span>
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold text-gray-800">
                                {profile?.stats?.losses || 0}
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-200">
                            <div className="flex items-center gap-2 text-purple-600 mb-1">
                                <TrendingUp size={18} />
                                <span className="text-sm font-medium">Win Rate</span>
                            </div>
                            <div className="text-2xl sm:text-3xl font-bold text-gray-800">
                                {profile?.stats?.winRate || 0}%
                            </div>
                        </div>
                    </div>
                </div>

                {/* Friends Section */}
                <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-4 sm:p-8 mb-4">
                    <button
                        onClick={() => setShowFriendsPanel(true)}
                        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-200 hover:from-teal-100 hover:to-emerald-100 transition"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-teal-500 rounded-full flex items-center justify-center">
                                <Users size={24} className="text-white" />
                            </div>
                            <div className="text-left">
                                <h3 className="font-bold text-gray-800">Friends & Requests</h3>
                                <p className="text-sm text-gray-600">Manage friends, view requests, search players</p>
                            </div>
                        </div>
                        <ChevronDown size={24} className="text-teal-500 rotate-[-90deg]" />
                    </button>
                </div>

                {/* Game History */}
                <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-4 sm:p-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock size={24} className="text-teal-600" />
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Game History</h2>
                    </div>

                    {gameHistory.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Target size={48} className="mx-auto mb-3 text-gray-300" />
                            <p>No games played yet!</p>
                            <p className="text-sm">Start playing to see your history here.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {gameHistory.map((game) => {
                                const myPlayer = game.players?.find(p => p.uid === user?.uid);
                                const myTeam = myPlayer?.team;
                                const isWin = myTeam === game.winner;

                                return (
                                    <div
                                        key={game.id}
                                        className={`rounded-xl border-2 overflow-hidden ${isWin
                                            ? 'bg-green-50 border-green-300'
                                            : 'bg-red-50 border-red-300'
                                            }`}
                                    >
                                        {/* Game Summary - Clickable */}
                                        <button
                                            onClick={() => setExpandedGame(expandedGame === game.id ? null : game.id)}
                                            className="w-full p-4 text-left"
                                        >
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isWin ? 'bg-green-500' : 'bg-red-500'
                                                        } text-white font-bold`}>
                                                        {isWin ? '🏆' : '❌'}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-800">
                                                            {isWin ? 'Victory!' : 'Defeat'}
                                                        </div>
                                                        <div className="text-sm text-gray-600">
                                                            {TEAM_COLORS[myTeam]?.name || `Team ${myTeam}`} • {game.teamAScore} - {game.teamBScore}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <div className="text-sm text-gray-500">
                                                            {formatDate(game.createdAt)}
                                                        </div>
                                                        <div className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                                                            <Users size={12} />
                                                            {game.players?.length || 0} players
                                                        </div>
                                                    </div>
                                                    {expandedGame === game.id
                                                        ? <ChevronUp size={20} className="text-gray-400" />
                                                        : <ChevronDown size={20} className="text-gray-400" />
                                                    }
                                                </div>
                                            </div>
                                        </button>

                                        {/* Expanded Player List */}
                                        {expandedGame === game.id && (
                                            <div className="border-t border-gray-200 p-4 bg-white/50">
                                                <div className="text-xs font-semibold text-gray-500 mb-2">Players in this game:</div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {/* Sort players by team (Team A/Red first, then Team B/Blue) */}
                                                    {game.players?.sort((a, b) => a.team.localeCompare(b.team)).map((player, idx) => {
                                                        const isMe = player.uid === user?.uid;
                                                        const canAddFriend = !isMe && player.uid && !sentRequests.has(player.uid);

                                                        return (
                                                            <div
                                                                key={idx}
                                                                className={`flex items-center justify-between p-2 rounded-lg ${player.team === 'A' ? 'bg-red-100' : 'bg-blue-100'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${player.team === 'A' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'
                                                                        }`}>
                                                                        {player.team === 'A' ? 'R' : 'B'}
                                                                    </div>
                                                                    <span className={`text-sm ${isMe ? 'font-bold' : ''}`}>
                                                                        {player.name}{isMe ? ' (You)' : ''}
                                                                    </span>
                                                                    {player.isGuest && (
                                                                        <span className="text-xs text-gray-400">(Guest)</span>
                                                                    )}
                                                                </div>

                                                                {canAddFriend && (
                                                                    <button
                                                                        onClick={() => handleSendFriendRequest(player.uid, player.name)}
                                                                        className="p-1 text-teal-600 hover:bg-teal-100 rounded transition"
                                                                        title="Add Friend"
                                                                    >
                                                                        <UserPlus size={16} />
                                                                    </button>
                                                                )}
                                                                {sentRequests.has(player.uid) && (
                                                                    <span className="text-xs text-green-600">✓ Sent</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Avatar Picker Modal */}
            {showAvatarPicker && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">Choose Your Avatar</h3>

                        <div className="grid grid-cols-4 gap-3 mb-6">
                            {PRESET_AVATARS.map((avatar) => (
                                <button
                                    key={avatar.id}
                                    onClick={() => handleSelectAvatar(avatar.id)}
                                    className={`aspect-square ${avatar.bg} rounded-xl flex items-center justify-center text-3xl hover:scale-105 transition ${selectedAvatar === avatar.id ? 'ring-4 ring-teal-500 ring-offset-2' : ''
                                        }`}
                                >
                                    {avatar.emoji}
                                </button>
                            ))}
                        </div>

                        {/* Custom Upload Section */}
                        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                            <h4 className="text-sm font-semibold mb-3 text-gray-700">Upload Custom Avatar</h4>

                            <input
                                type="file"
                                id="avatar-upload"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleFileSelect}
                                className="hidden"
                            />

                            {previewURL ? (
                                <div className="space-y-3">
                                    <div className="flex justify-center">
                                        <img
                                            src={previewURL}
                                            alt="Avatar preview"
                                            className="w-24 h-24 rounded-full object-cover border-4 border-teal-400"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                setSelectedFile(null);
                                                setPreviewURL(null);
                                            }}
                                            className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-3 rounded-lg text-sm font-medium transition"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleUploadAvatar}
                                            disabled={uploadingAvatar}
                                            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white py-2 px-3 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                                        >
                                            {uploadingAvatar ? `Uploading... ${uploadProgress}%` : 'Upload'}
                                        </button>
                                    </div>
                                    {uploadingAvatar && (
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <label
                                    htmlFor="avatar-upload"
                                    className="block w-full bg-white hover:bg-gray-50 border-2 border-dashed border-gray-300 hover:border-teal-400 rounded-lg p-6 text-center cursor-pointer transition"
                                >
                                    <Camera className="mx-auto mb-2 text-gray-400" size={32} />
                                    <p className="text-sm text-gray-600 font-medium">Click to select image</p>
                                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP (Max 2MB)</p>
                                </label>
                            )}
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowAvatarPicker(false)}
                                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-xl font-semibold transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={async () => {
                                    await updateAvatar(user.uid, 'google', null);
                                    setProfile(prev => ({
                                        ...prev,
                                        avatarType: 'google',
                                        customAvatar: null
                                    }));
                                    setSelectedAvatar(null);
                                    setShowAvatarPicker(false);
                                }}
                                className="flex-1 bg-teal-100 hover:bg-teal-200 text-teal-700 py-2 rounded-xl font-semibold transition"
                            >
                                Use Google Photo
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Friends Panel */}
            <FriendsPanel
                isOpen={showFriendsPanel}
                onClose={() => setShowFriendsPanel(false)}
            />
        </div>
    );
};

export default ProfileScreen;
