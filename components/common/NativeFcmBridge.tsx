"use client";

import { useNativeFcmBridge } from "@/hooks/useNativeFcmBridge";

/**
 * Mount-only bridge: registers the Flutter-injected native FCM token when the
 * app runs inside the mobile WebView shell. Renders nothing; self-guards via
 * `isProWebView()` so it's inert in a real browser.
 */
export default function NativeFcmBridge() {
  useNativeFcmBridge();
  return null;
}
