'use client';
import { AuthProvider } from '../contexts/AuthContext';
import { SocketProvider } from '../contexts/SocketContext';

export default function Providers({ children }) {
    return (
        <SocketProvider>
            <AuthProvider>{children}</AuthProvider>
        </SocketProvider>
    );
}
