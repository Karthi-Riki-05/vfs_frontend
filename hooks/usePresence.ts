"use client";

import { useEffect, useState, useCallback } from 'react';

interface PresenceState {
    [userId: string]: {
        online: boolean;
        lastSeen?: string;
    };
}

export function usePresence(userIds: string[] = []) {
    const [presence, setPresence] = useState<PresenceState>({});

    useEffect(() => {
        let cleanup: (() => void) | undefined;

        const setup = async () => {
            try {
                const { getSocket } = await import('@/lib/socket');
                const socket = getSocket();
                if (!socket) return;

                // Request initial presence status
                if (userIds.length > 0) {
                    socket.emit('presence:request', { userIds });
                }

                const onPresenceResponse = (data: { statuses: Record<string, boolean> }) => {
                    setPresence(prev => {
                        const next = { ...prev };
                        for (const [uid, online] of Object.entries(data.statuses)) {
                            next[uid] = { ...next[uid], online };
                        }
                        return next;
                    });
                };

                const onUserOnline = (data: { userId: string }) => {
                    setPresence(prev => ({
                        ...prev,
                        [data.userId]: { online: true },
                    }));
                };

                const onUserOffline = (data: { userId: string; lastSeen: string }) => {
                    setPresence(prev => ({
                        ...prev,
                        [data.userId]: { online: false, lastSeen: data.lastSeen },
                    }));
                };

                socket.on('presence:response', onPresenceResponse);
                socket.on('user:online', onUserOnline);
                socket.on('user:offline', onUserOffline);

                cleanup = () => {
                    socket.off('presence:response', onPresenceResponse);
                    socket.off('user:online', onUserOnline);
                    socket.off('user:offline', onUserOffline);
                };
            } catch {
                // socket not available
            }
        };

        setup();

        return () => {
            cleanup?.();
        };
    }, [userIds.join(',')]);

    const isOnline = useCallback((userId: string) => {
        return presence[userId]?.online ?? false;
    }, [presence]);

    const getLastSeen = useCallback((userId: string) => {
        return presence[userId]?.lastSeen;
    }, [presence]);

    return { presence, isOnline, getLastSeen };
}
