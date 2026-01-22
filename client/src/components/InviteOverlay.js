import React, { useState, useEffect } from 'react';
import { Mail, Check, X, Clock } from 'lucide-react';

const InviteOverlay = ({ invite, onAccept, onDecline }) => {
    const [timeLeft, setTimeLeft] = useState(30);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onDecline();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onDecline]);

    if (!invite) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center animate-[bounceIn_0.4s_ease-out]">
                {/* Icon */}
                <div className="relative mb-4">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-teal-500 to-emerald-500 rounded-full flex items-center justify-center">
                        <Mail className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1/4 w-8 h-8 bg-teal-400 rounded-full flex items-center justify-center animate-bounce">
                        <span className="text-white text-lg">🎮</span>
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    Game Invite!
                </h2>

                {/* Inviter info */}
                <p className="text-lg text-gray-600 mb-4">
                    <span className="font-semibold text-teal-600">{invite.fromName}</span>
                    <br />
                    wants you to join their game
                </p>

                {/* Room code */}
                <div className="bg-gray-100 rounded-xl p-4 mb-6">
                    <div className="text-sm text-gray-500 mb-1">Room Code</div>
                    <div className="text-2xl font-mono font-bold text-teal-600">
                        {invite.roomCode}
                    </div>
                </div>

                {/* Timer */}
                <div className="flex items-center justify-center gap-2 text-gray-500 mb-6">
                    <Clock size={16} />
                    <span className={`font-medium ${timeLeft <= 10 ? 'text-red-500' : ''}`}>
                        Expires in {timeLeft}s
                    </span>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={onDecline}
                        className="flex-1 flex items-center justify-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-xl font-semibold transition"
                    >
                        <X size={20} />
                        Decline
                    </button>
                    <button
                        onClick={onAccept}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition"
                    >
                        <Check size={20} />
                        Join Game
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InviteOverlay;
