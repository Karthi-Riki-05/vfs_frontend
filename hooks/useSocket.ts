"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { connectSocket, getSocket } from '@/lib/socket';
import type { Socket } from 'socket.io-client';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export function useSocket() {
    const { data: session, status: sessionStatus } = useSession();
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const [socket, setSocket] = useState<Socket | null>(null);

    const fetchToken = useCallback(async (): Promise<string | null> => {
        try {
            const res = await fetch('/api/chat/socket-token');
            const data = await res.json();
            return data?.data?.token || null;
        } catch {
            return null;
        }
    }, []);

    useEffect(() => {
        if (sessionStatus !== 'authenticated') return;

        let cancelled = false;

        const init = async () => {
            setConnectionStatus('connecting');
            const token = await fetchToken();
            if (cancelled || !token) return;

            const s = await connectSocket(token);
            if (cancelled) return;

            setSocket(s);

            const onConnect = () => { if (!cancelled) setConnectionStatus('connected'); };
            const onDisconnect = () => { if (!cancelled) setConnectionStatus('disconnected'); };
            const onReconnecting = () => { if (!cancelled) setConnectionStatus('reconnecting'); };
            const onReconnect = () => { if (!cancelled) setConnectionStatus('connected'); };
            const onConnectError = () => { if (!cancelled) setConnectionStatus('disconnected'); };

            s.on('connect', onConnect);
            s.on('disconnect', onDisconnect);
            s.io.on('reconnect_attempt', onReconnecting);
            s.io.on('reconnect', onReconnect);
            s.on('connect_error', onConnectError);

            if (s.connected) setConnectionStatus('connected');
        };

        init();

        return () => {
            cancelled = true;
        };
    }, [sessionStatus, fetchToken]);

    const reconnect = useCallback(async () => {
        setConnectionStatus('connecting');
        const token = await fetchToken();
        if (token) {
            const s = await connectSocket(token);
            setSocket(s);
        }
    }, [fetchToken]);

    return { socket, status: connectionStatus, reconnect };
}
