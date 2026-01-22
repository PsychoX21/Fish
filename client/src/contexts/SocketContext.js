'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

const SocketContext = createContext(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const socketRef = useRef(null);
    const initStarted = useRef(false);

    useEffect(() => {
        // Only run on client
        if (typeof window === 'undefined') return;

        // Already initialized or initializing
        if (initStarted.current) {
            if (socketRef.current) {
                setSocket(socketRef.current);
                setConnected(socketRef.current.connected);
            }
            return;
        }

        initStarted.current = true;

        // Dynamic import to avoid chunk loading race condition
        const initSocket = async () => {
            const { io } = await import('socket.io-client');

            const newSocket = io(SOCKET_URL, {
                transports: ['polling', 'websocket'],
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                timeout: 10000,
            });

            socketRef.current = newSocket;

            newSocket.on('connect', () => {
                console.log('Connected to server');
                setConnected(true);
            });

            newSocket.on('disconnect', () => {
                console.log('Disconnected from server');
                setConnected(false);
            });

            newSocket.on('connect_error', (error) => {
                console.log('Connection error:', error.message);
            });

            newSocket.on('AUTH_SUCCESS', ({ token }) => {
                localStorage.setItem('token', token);
                console.log('Token saved');
            });

            newSocket.on('ERROR', (err) => {
                console.error(err);
                alert(err.message);
            });

            setSocket(newSocket);
        };

        initSocket();

        return () => {
            // Don't disconnect - keep connection alive
        };
    }, []);

    const emit = useCallback((event, data) => {
        socketRef.current?.emit(event, data);
    }, []);

    const on = useCallback((event, cb) => {
        socketRef.current?.on(event, cb);
        return () => socketRef.current?.off(event, cb);
    }, []);

    return (
        <SocketContext.Provider value={{ socket, connected, emit, on }}>
            {children}
        </SocketContext.Provider>
    );
};

