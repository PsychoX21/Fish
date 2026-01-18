import { useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Prevent duplicate connections
    if (socketRef.current) return;

    const newSocket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'], // Start with polling, upgrade to websocket
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

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const emit = useCallback((event, data) => {
    socket?.emit(event, data);
  }, [socket]);

  const on = useCallback((event, cb) => {
    socket?.on(event, cb);
    return () => socket?.off(event, cb);
  }, [socket]);

  return { socket, connected, emit, on };
};
