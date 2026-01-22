import { db } from './firebaseConfig';
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    where,
    orderBy,
    limit,
    getDocs,
    addDoc,
    serverTimestamp,
    increment
} from 'firebase/firestore';

// ================== AVATAR OPERATIONS ==================

/**
 * Compress and convert image to base64 (stores in Firestore, no Storage needed)
 */
export const uploadAvatar = async (file, userId) => {
    if (!file || !userId) throw new Error('File and userId are required');

    // Validate file size (2MB max for base64 to stay under Firestore 1MB limit after compression)
    const MAX_SIZE = 2 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        throw new Error('File size must be less than 2MB');
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        throw new Error('Only JPG, PNG, and WebP images are allowed');
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                // Compress image to max 400x400
                const canvas = document.createElement('canvas');
                const MAX_DIMENSION = 400;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_DIMENSION) {
                        height *= MAX_DIMENSION / width;
                        width = MAX_DIMENSION;
                    }
                } else {
                    if (height > MAX_DIMENSION) {
                        width *= MAX_DIMENSION / height;
                        height = MAX_DIMENSION;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Convert to base64 (JPEG with 0.8 quality for better compression)
                const base64 = canvas.toDataURL('image/jpeg', 0.8);
                resolve(base64);
            };

            img.onerror = reject;
            img.src = e.target.result;
        };

        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

/**
 * Update user's avatar in Firestore (stores base64 directly)
 */
export const updateUserAvatar = async (userId, avatarBase64, avatarType = 'custom') => {
    if (!userId) throw new Error('userId is required');

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        customAvatar: avatarBase64,
        avatarType: avatarType,
        updatedAt: serverTimestamp()
    });
};

/**
 * Get user's current avatar (priority: custom > google > default)
 */
export const getUserAvatar = async (userId) => {
    if (!userId) return null;

    const profile = await getProfile(userId);
    if (!profile) return null;

    // Priority: customAvatar (base64) > photoURL (Google) > null
    return profile.customAvatar || profile.photoURL || null;
};

// ================== PROFILE OPERATIONS ==================

/**
 * Get or create a user profile
 */
export const getOrCreateProfile = async (user) => {
    if (!user?.uid) return null;

    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
        // Update last active timestamp
        await updateDoc(userRef, {
            lastActive: serverTimestamp()
        });
        return { id: userDoc.id, ...userDoc.data() };
    }

    // Create new profile
    const newProfile = {
        displayName: user.displayName || 'Player',
        email: user.email || '',
        photoURL: user.photoURL || '',
        avatarType: 'google', // 'google', 'custom', 'default'
        customAvatar: null,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        stats: {
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            winRate: 0
        }
    };

    await setDoc(userRef, newProfile);
    return { id: user.uid, ...newProfile };
};

/**
 * Get a user profile by UID
 */
export const getProfile = async (uid) => {
    if (!uid) return null;

    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
};

/**
 * Update user profile
 */
export const updateProfile = async (uid, data) => {
    if (!uid) return;

    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
        ...data,
        lastActive: serverTimestamp()
    });
};

/**
 * Update user avatar
 */
export const updateAvatar = async (uid, avatarType, customAvatar = null) => {
    if (!uid) return;

    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
        avatarType,
        customAvatar,
        lastActive: serverTimestamp()
    });
};

// ================== GAME HISTORY OPERATIONS ==================

/**
 * Record a completed game
 */
export const recordGame = async (gameData) => {
    const {
        roomCode,
        players, // [{ id, name, team, isGuest, googleUid }]
        teamAScore,
        teamBScore,
        winner // 'A' or 'B'
    } = gameData;

    const gameRecord = {
        roomCode,
        createdAt: serverTimestamp(),
        players: players.map(p => ({
            name: p.name,
            team: p.team,
            isGuest: !p.googleUid,
            uid: p.googleUid || null
        })),
        teamAScore,
        teamBScore,
        winner,
        participantIds: players
            .filter(p => p.googleUid)
            .map(p => p.googleUid)
    };

    // Add game record
    const gameRef = await addDoc(collection(db, 'games'), gameRecord);

    // Update stats for each logged-in player
    for (const player of players) {
        if (player.googleUid) {
            const userRef = doc(db, 'users', player.googleUid);
            const isWinner = player.team === winner;

            await updateDoc(userRef, {
                'stats.gamesPlayed': increment(1),
                'stats.wins': increment(isWinner ? 1 : 0),
                'stats.losses': increment(isWinner ? 0 : 1),
                lastActive: serverTimestamp()
            });

            // Recalculate win rate
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
                const stats = userDoc.data().stats;
                const winRate = stats.gamesPlayed > 0
                    ? Math.round((stats.wins / stats.gamesPlayed) * 100)
                    : 0;
                await updateDoc(userRef, { 'stats.winRate': winRate });
            }
        }
    }

    return gameRef.id;
};

/**
 * Get game history for a user
 */
export const getGameHistory = async (uid, limitCount = 20) => {
    if (!uid) return [];

    const gamesRef = collection(db, 'games');
    const q = query(
        gamesRef,
        where('participantIds', 'array-contains', uid),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || null
    }));
};

// ================== FRIEND OPERATIONS ==================

/**
 * Send a friend request (expires after 7 days)
 * If request already exists, resets the expiry time
 */
export const sendFriendRequest = async (fromUid, toUid) => {
    if (!fromUid || !toUid || fromUid === toUid) return null;

    // Get sender's profile for name/photo
    const senderProfile = await getProfile(fromUid);
    if (!senderProfile) return null;

    const friendRef = doc(db, 'friends', fromUid, 'list', toUid);
    const receiverRef = doc(db, 'friends', toUid, 'list', fromUid);
    const existingDoc = await getDoc(friendRef);

    // Calculate expiry date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    if (existingDoc.exists()) {
        const data = existingDoc.data();

        // If already friends, don't do anything
        if (data.status === 'accepted') {
            return { error: 'Already friends' };
        }

        // If pending, reset the expiry time
        if (data.status === 'pending') {
            await updateDoc(friendRef, {
                createdAt: serverTimestamp(),
                expiresAt: expiresAt
            });
            await updateDoc(receiverRef, {
                createdAt: serverTimestamp(),
                expiresAt: expiresAt,
                senderName: senderProfile.displayName,
                senderPhoto: senderProfile.photoURL
            });
            return { success: true, renewed: true };
        }
    }

    // Create friend request in sender's list
    await setDoc(friendRef, {
        status: 'pending',
        initiatedBy: fromUid,
        createdAt: serverTimestamp(),
        expiresAt: expiresAt
    });

    // Create corresponding entry in receiver's list
    await setDoc(receiverRef, {
        status: 'pending',
        initiatedBy: fromUid,
        createdAt: serverTimestamp(),
        expiresAt: expiresAt,
        senderName: senderProfile.displayName,
        senderPhoto: senderProfile.photoURL
    });

    return { success: true };
};

/**
 * Respond to a friend request
 */
export const respondToFriendRequest = async (myUid, fromUid, accept) => {
    if (!myUid || !fromUid) return;

    const myRef = doc(db, 'friends', myUid, 'list', fromUid);
    const theirRef = doc(db, 'friends', fromUid, 'list', myUid);

    if (accept) {
        await updateDoc(myRef, { status: 'accepted' });
        await updateDoc(theirRef, { status: 'accepted' });
    } else {
        // Delete the request
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(myRef);
        await deleteDoc(theirRef);
    }
};

/**
 * Get friends list
 */
export const getFriends = async (uid) => {
    if (!uid) return [];

    const friendsRef = collection(db, 'friends', uid, 'list');
    const q = query(friendsRef, where('status', '==', 'accepted'));
    const snapshot = await getDocs(q);

    const friends = [];
    for (const docSnap of snapshot.docs) {
        const friendProfile = await getProfile(docSnap.id);
        if (friendProfile) {
            friends.push({
                id: docSnap.id,
                ...friendProfile,
                friendSince: docSnap.data().createdAt?.toDate?.() || null
            });
        }
    }

    return friends;
};

/**
 * Get pending friend requests (received, excludes expired)
 */
export const getPendingRequests = async (uid) => {
    if (!uid) return [];

    const friendsRef = collection(db, 'friends', uid, 'list');
    const q = query(
        friendsRef,
        where('status', '==', 'pending'),
        where('initiatedBy', '!=', uid)
    );
    const snapshot = await getDocs(q);

    const now = new Date();
    const requests = [];

    for (const docSnap of snapshot.docs) {
        const data = docSnap.data();

        // Skip expired requests
        if (data.expiresAt) {
            const expiryDate = data.expiresAt instanceof Date
                ? data.expiresAt
                : data.expiresAt.toDate?.() || new Date(data.expiresAt);

            if (expiryDate < now) {
                // Clean up expired request
                const { deleteDoc } = await import('firebase/firestore');
                await deleteDoc(doc(db, 'friends', uid, 'list', docSnap.id));
                await deleteDoc(doc(db, 'friends', docSnap.id, 'list', uid));
                continue;
            }
        }

        requests.push({
            fromUid: docSnap.id,
            senderName: data.senderName || 'Unknown',
            senderPhoto: data.senderPhoto || '',
            createdAt: data.createdAt?.toDate?.() || null,
            expiresAt: data.expiresAt?.toDate?.() || null
        });
    }

    return requests;
};

/**
 * Remove a friend
 */
export const removeFriend = async (myUid, friendUid) => {
    if (!myUid || !friendUid) return;

    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'friends', myUid, 'list', friendUid));
    await deleteDoc(doc(db, 'friends', friendUid, 'list', myUid));
};

/**
 * Search users by display name
 */
export const searchUsers = async (searchQuery, currentUid, limitCount = 10) => {
    if (!searchQuery || searchQuery.length < 2) return [];

    const usersRef = collection(db, 'users');
    // Note: Firestore doesn't support native full-text search
    // This is a simple prefix-based search
    const q = query(
        usersRef,
        where('displayName', '>=', searchQuery),
        where('displayName', '<=', searchQuery + '\uf8ff'),
        limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs
        .filter(doc => doc.id !== currentUid)
        .map(doc => ({
            id: doc.id,
            displayName: doc.data().displayName,
            photoURL: doc.data().photoURL,
            stats: doc.data().stats
        }));
};
