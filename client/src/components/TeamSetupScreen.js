import React, { useState } from 'react';
import { ArrowLeftRight, Check, X, Crown, Play, RefreshCw } from 'lucide-react';
import { TEAM_COLORS } from '../lib/constants';

const TeamSetupScreen = ({
    room,
    socket,
    teams,
    swapRequests,
    onSendSwapRequest,
    onRespondSwapRequest,
    onConfirmTeams,
    onRandomizeTeams
}) => {
    const [pendingSwap, setPendingSwap] = useState(null);

    const players = room.players;
    const isHost = players.find(p => p.id === socket?.id)?.isHost;

    const getPlayerTeam = (playerId) => {
        return teams.A.includes(playerId) ? 'A' : 'B';
    };

    const myTeam = getPlayerTeam(socket.id);
    const oppositeTeam = myTeam === 'A' ? 'B' : 'A';

    const myTeamPlayers = players.filter(p => teams[myTeam].includes(p.id));
    const oppositeTeamPlayers = players.filter(p => teams[oppositeTeam].includes(p.id));

    // Check if there's a pending swap request for me
    const incomingRequest = swapRequests.find(r => r.targetId === socket.id && r.status === 'pending');

    // Check if I have a pending outgoing request
    const outgoingRequest = swapRequests.find(r => r.fromId === socket.id && r.status === 'pending');

    const handleRequestSwap = (targetId) => {
        if (outgoingRequest) {
            alert('You already have a pending swap request');
            return;
        }
        setPendingSwap(targetId);
    };

    const confirmSwapRequest = () => {
        if (pendingSwap) {
            onSendSwapRequest(pendingSwap);
            setPendingSwap(null);
        }
    };

    const cancelSwapRequest = () => {
        setPendingSwap(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 p-4">
            <div className="max-w-5xl mx-auto">
                <div className="bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-6 md:p-8">

                    {/* Header */}
                    <div className="text-center mb-4 sm:mb-6">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Team Setup</h2>
                        <p className="text-sm sm:text-base text-gray-600">Review your teams and request swaps before starting</p>
                    </div>

                    {/* Incoming Swap Request Alert */}
                    {incomingRequest && (
                        <div className="mb-6 bg-amber-50 border-2 border-amber-400 rounded-xl p-4 animate-pulse">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <div className="flex items-center gap-3">
                                    <ArrowLeftRight className="text-amber-600" size={24} />
                                    <div>
                                        <div className="font-semibold text-amber-800">Swap Request!</div>
                                        <div className="text-sm text-amber-700">
                                            <span className="font-bold">{players.find(p => p.id === incomingRequest.fromId)?.name}</span>
                                            {' '}wants to swap teams with you
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => onRespondSwapRequest(incomingRequest.id, true)}
                                        className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition"
                                    >
                                        <Check size={18} /> Accept
                                    </button>
                                    <button
                                        onClick={() => onRespondSwapRequest(incomingRequest.id, false)}
                                        className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition"
                                    >
                                        <X size={18} /> Decline
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Outgoing Request Status */}
                    {outgoingRequest && (
                        <div className="mb-6 bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
                            <div className="flex items-center gap-3">
                                <div className="animate-spin">
                                    <RefreshCw className="text-blue-600" size={20} />
                                </div>
                                <div className="text-blue-800">
                                    Waiting for <span className="font-bold">{players.find(p => p.id === outgoingRequest.targetId)?.name}</span> to respond to your swap request...
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Teams Display */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">

                        {/* Red Team (Team A) */}
                        <div className={`rounded-2xl p-4 ${TEAM_COLORS.A.bg} border-2 ${TEAM_COLORS.A.border}`}>
                            <h3 className={`text-xl font-bold mb-4 ${TEAM_COLORS.A.primary} flex items-center gap-2`}>
                                <div className={`w-4 h-4 rounded-full ${TEAM_COLORS.A.bgDark}`}></div>
                                {TEAM_COLORS.A.name}
                            </h3>
                            <div className="space-y-2">
                                {players.filter(p => teams.A.includes(p.id)).map(player => {
                                    const isMe = player.id === socket.id;
                                    const isOpponentForMe = myTeam !== 'A';

                                    return (
                                        <div
                                            key={player.id}
                                            className={`flex items-center justify-between p-3 rounded-xl bg-white/80 border ${isMe ? 'ring-2 ring-teal-500' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 ${TEAM_COLORS.A.avatar} text-white rounded-full flex items-center justify-center font-bold`}>
                                                    {player.name[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold flex items-center gap-2">
                                                        {player.name}
                                                        {isMe && <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">You</span>}
                                                    </div>
                                                    {player.isHost && (
                                                        <div className="text-xs text-teal-600 flex items-center gap-1">
                                                            <Crown size={12} /> Host
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Swap button - only show for opponents */}
                                            {isOpponentForMe && !isMe && !outgoingRequest && (
                                                <button
                                                    onClick={() => handleRequestSwap(player.id)}
                                                    className="flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1.5 rounded-lg text-sm font-medium transition"
                                                >
                                                    <ArrowLeftRight size={14} /> Swap
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Blue Team (Team B) */}
                        <div className={`rounded-2xl p-4 ${TEAM_COLORS.B.bg} border-2 ${TEAM_COLORS.B.border}`}>
                            <h3 className={`text-xl font-bold mb-4 ${TEAM_COLORS.B.primary} flex items-center gap-2`}>
                                <div className={`w-4 h-4 rounded-full ${TEAM_COLORS.B.bgDark}`}></div>
                                {TEAM_COLORS.B.name}
                            </h3>
                            <div className="space-y-2">
                                {players.filter(p => teams.B.includes(p.id)).map(player => {
                                    const isMe = player.id === socket.id;
                                    const isOpponentForMe = myTeam !== 'B';

                                    return (
                                        <div
                                            key={player.id}
                                            className={`flex items-center justify-between p-3 rounded-xl bg-white/80 border ${isMe ? 'ring-2 ring-teal-500' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 ${TEAM_COLORS.B.avatar} text-white rounded-full flex items-center justify-center font-bold`}>
                                                    {player.name[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="font-semibold flex items-center gap-2">
                                                        {player.name}
                                                        {isMe && <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">You</span>}
                                                    </div>
                                                    {player.isHost && (
                                                        <div className="text-xs text-teal-600 flex items-center gap-1">
                                                            <Crown size={12} /> Host
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Swap button - only show for opponents */}
                                            {isOpponentForMe && !isMe && !outgoingRequest && (
                                                <button
                                                    onClick={() => handleRequestSwap(player.id)}
                                                    className="flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-1.5 rounded-lg text-sm font-medium transition"
                                                >
                                                    <ArrowLeftRight size={14} /> Swap
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Swap Confirmation Modal */}
                    {pendingSwap && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
                                <h3 className="text-xl font-bold mb-4">Confirm Swap Request</h3>
                                <p className="text-gray-600 mb-6">
                                    Request to swap teams with <span className="font-bold">{players.find(p => p.id === pendingSwap)?.name}</span>?
                                    They will need to accept for the swap to happen.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={cancelSwapRequest}
                                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-2 rounded-xl font-semibold transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={confirmSwapRequest}
                                        className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2 rounded-xl font-semibold hover:shadow-lg transition"
                                    >
                                        Send Request
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        {isHost && (
                            <>
                                <button
                                    onClick={onRandomizeTeams}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-xl font-semibold transition"
                                >
                                    <RefreshCw size={20} /> Randomize Teams
                                </button>
                                <button
                                    onClick={onConfirmTeams}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 rounded-xl font-bold text-lg hover:shadow-lg transition"
                                >
                                    <Play size={20} /> Start Game
                                </button>
                            </>
                        )}
                        {!isHost && (
                            <div className="text-center text-gray-600 py-3">
                                Waiting for host to start the game...
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default TeamSetupScreen;
