import { createProxy } from "@/lib/proxy";

/** Turning biometric login off, or dropping a lost phone. Session-scoped. */
export const { POST } = createProxy("/api/v1/auth/biometric/revoke", ["POST"]);
