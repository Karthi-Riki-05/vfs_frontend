"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/useMediaQuery";

/**
 * /dashboard/chat/:groupId
 * Opens the chat column (desktop) or navigates to the chat page (mobile),
 * then redirects to dashboard.
 */
export default function ChatGroupRedirect() {
  const router = useRouter();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isMobile) {
      router.replace("/dashboard/chat");
    } else {
      (window as any).__openChat?.();
      router.replace("/dashboard");
    }
  }, [router, isMobile]);

  return null;
}
