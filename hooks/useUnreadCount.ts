"use client";

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/axios';

interface UnreadState {
    totalUnread: number;
    perGroup: Record<string, number>;
}

export function useUnreadCount() {
    const [unread, setUnread] = useState<UnreadState>({ totalUnread: 0, perGroup: {} });

    // Fetch initial counts from API
    const fetchCounts = useCallback(async () => {
        try {
            const res = await api.get('/chat/unread-count');
            const data = res.data?.data || res.data;
            if (data && typeof data.totalUnread === 'number') {
                setUnread({
                    totalUnread: data.totalUnread,
                    perGroup: data.perGroup || {},
                });
            }
        } catch {
            // Silently fail — user may not have chat access
        }
    }, []);

    useEffect(() => {
        fetchCounts();
    }, [fetchCounts]);

    // Listen for socket updates (dynamically import to avoid SSR issues)
    useEffect(() => {
        let cleanup: (() => void) | undefined;

        const setup = async () => {
            try {
                const { getSocket } = await import('@/lib/socket');
                const socket = getSocket();
                if (!socket) return;

                const onUnreadCount = (data: { totalUnread: number; groupId: string }) => {
                    setUnread(prev => ({
                        totalUnread: data.totalUnread,
                        perGroup: {
                            ...prev.perGroup,
                            [data.groupId]: (prev.perGroup[data.groupId] || 0) + 1,
                        },
                    }));
                };

                const onMessageRead = () => {
                    fetchCounts();
                };

                socket.on('notification:unread-count', onUnreadCount);
                socket.on('message:read', onMessageRead);

                cleanup = () => {
                    socket.off('notification:unread-count', onUnreadCount);
                    socket.off('message:read', onMessageRead);
                };
            } catch {
                // socket not available, rely on REST polling
            }
        };

        setup();

        // Poll every 60s as fallback when socket isn't connected
        const interval = setInterval(fetchCounts, 60000);

        return () => {
            cleanup?.();
            clearInterval(interval);
        };
    }, [fetchCounts]);

    const getUnreadCount = useCallback((groupId: string) => {
        return unread.perGroup[groupId] || 0;
    }, [unread.perGroup]);

    const markGroupAsRead = useCallback((groupId: string) => {
        setUnread(prev => {
            const groupUnread = prev.perGroup[groupId] || 0;
            const newPerGroup = { ...prev.perGroup };
            delete newPerGroup[groupId];
            return {
                totalUnread: Math.max(0, prev.totalUnread - groupUnread),
                perGroup: newPerGroup,
            };
        });
    }, []);

    return {
        totalUnread: unread.totalUnread,
        perGroup: unread.perGroup,
        getUnreadCount,
        markGroupAsRead,
        refetch: fetchCounts,
    };
}
