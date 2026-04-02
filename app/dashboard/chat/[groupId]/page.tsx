"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * /dashboard/chat/:groupId
 * Opens the chat column (desktop) or navigates to the chat page (mobile),
 * then redirects to dashboard.
 */
export default function ChatGroupRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (window.innerWidth < 768) {
      router.replace('/dashboard/chat');
    } else {
      (window as any).__openChat?.();
      router.replace('/dashboard');
    }
  }, [router]);

  return null;
}
