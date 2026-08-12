import { createStoreCallbackProxy } from "@/lib/proxy";

/**
 * App Store Server Notifications V2 endpoint.
 *
 * Set this URL in App Store Connect → your app → App Information →
 * App Store Server Notifications, for BOTH the production and sandbox URLs:
 *   https://<host>/api/iap/apple/notifications
 *
 * Authenticity is the JWS signature chain, verified backend-side against the
 * pinned Apple root CA — see backend/src/services/applestore.service.js.
 */
export const POST = createStoreCallbackProxy("/api/v1/iap/apple/notifications");
