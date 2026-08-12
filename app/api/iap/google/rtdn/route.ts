import { createStoreCallbackProxy } from "@/lib/proxy";

/**
 * Google Play Real-Time Developer Notifications, delivered as a Pub/Sub PUSH
 * subscription. Set the subscription's push endpoint to:
 *   https://<host>/api/iap/google/rtdn?token=<IAP_RTDN_TOKEN>
 *
 * The `?token=` query param IS the authenticity check (constant-time compared
 * backend-side), which is why this proxy preserves the query string.
 */
export const POST = createStoreCallbackProxy("/api/v1/iap/google/rtdn");
