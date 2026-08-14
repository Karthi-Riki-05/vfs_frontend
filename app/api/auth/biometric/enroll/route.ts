import { createProxy } from "@/lib/proxy";

/**
 * Enrolling rides the caller's live web session — that is the point: only a
 * user who is genuinely signed in right now may bind a new device credential.
 * `createProxy` enforces that (401 without a session) and mints the
 * short-lived backend JWT.
 */
export const { POST } = createProxy("/api/v1/auth/biometric/enroll", ["POST"]);
