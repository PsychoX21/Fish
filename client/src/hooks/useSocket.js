import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      reconnection: true,
    });

    socket.on('connect', () => {
      console.log('Connected');
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    socket.on('AUTH_SUCCESS', ({ token }) => {
      localStorage.setItem('token', token);
      console.log('Token saved');
    });

    socket.on('ERROR', (err) => {
      console.error(err);
      alert(err.message);
    });

    setSocket(socket);

    return () => socket.disconnect();
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
