"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect to the main chat page.
 * The chat UI is now a single-page layout with a left panel for group selection
 * and a right panel for messages, so individual group routes are no longer needed.
 */
export default function ChatGroupRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/chat');
  }, [router]);

  return null;
}
