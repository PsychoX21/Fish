import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Clock } from 'lucide-react';

const DisconnectOverlay = ({ disconnectedPlayerName, timeout, onDismiss }) => {
    const [timeLeft, setTimeLeft] = useState(Math.ceil(timeout / 1000));

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center animate-[slideIn_0.3s_ease-out]">
                <div className="relative mb-4 sm:mb-6">
                    <WifiOff className="w-16 h-16 sm:w-20 sm:h-20 mx-auto text-amber-500" />
                    <div className="absolute top-0 right-1/4 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                        <span className="text-white text-xs font-bold">!</span>
                    </div>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
                    Player Disconnected
                </h2>
                <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6">
                    <span className="font-semibold text-amber-600">{disconnectedPlayerName}</span> has lost connection
                </p>

                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Clock className="text-amber-600" size={20} />
                        <span className="text-xs sm:text-sm text-amber-700 font-medium">Time to reconnect</span>
                    </div>
                    <div className={`text-4xl sm:text-5xl font-bold ${timeLeft <= 10 ? 'text-red-600 animate-pulse' : 'text-amber-600'}`}>
                        {formatTime(timeLeft)}
                    </div>
                </div>

                <p className="text-xs sm:text-sm text-gray-500">
                    Game is paused. If they don't reconnect in time, their cards will be redistributed.
                </p>
            </div>
        </div>
    );
};

export default DisconnectOverlay;
