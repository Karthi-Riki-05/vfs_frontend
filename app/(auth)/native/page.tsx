import { Suspense } from "react";
import NativeAuthClient from "./NativeAuthClient";

/**
 * `/native` — the landing page for a biometric login from the native shell.
 *
 * The shell loads this URL with a one-time ticket after the OS has confirmed
 * the user's fingerprint / Face ID. Redeeming it here (rather than having
 * Flutter write a cookie itself) means NextAuth mints the session through its
 * normal path, so HttpOnly / SameSite / Secure all behave exactly as they do
 * for a password login.
 *
 * Rendered dynamically: it exists solely to act on a query parameter, and a
 * prerendered copy would be meaningless.
 */
export const dynamic = "force-dynamic";

export default function NativeAuthPage() {
  // useSearchParams() needs a Suspense boundary in the App Router.
  return (
    <Suspense fallback={null}>
      <NativeAuthClient />
    </Suspense>
  );
}
