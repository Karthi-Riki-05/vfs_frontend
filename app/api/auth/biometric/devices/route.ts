import { createProxy } from "@/lib/proxy";

/** "Your devices" list. The backend never returns a token or hash. */
export const { GET } = createProxy("/api/v1/auth/biometric/devices", ["GET"]);
