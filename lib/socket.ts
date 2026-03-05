"use client";

import type { Socket } from 'socket.io-client';

let socket: Socket | null = null;
let ioModule: typeof import('socket.io-client') | null = null;

const BACKEND_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

async function loadIO() {
    if (!ioModule) {
        ioModule = await import('socket.io-client');
    }
    return ioModule;
}

export function getSocket(): Socket | null {
    return socket;
}

export async function connectSocket(token: string): Promise<Socket> {
    if (socket?.connected) {
        return socket;
    }

    // Disconnect existing socket if any
    if (socket) {
        socket.disconnect();
    }

    const { io } = await loadIO();

    socket = io(BACKEND_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
    });

    socket.on('connect', () => {
        console.log('[Socket] Connected:', socket?.id);
        socket?.emit('chat:join-groups');
    });

    socket.io.on('reconnect', () => {
        console.log('[Socket] Reconnected');
        socket?.emit('chat:join-groups');
    });

    socket.on('connect_error', (err) => {
        console.warn('[Socket] Connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
    });

    return socket;
}

export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}
