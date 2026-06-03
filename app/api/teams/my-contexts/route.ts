import { createProxy } from "@/lib/proxy";

// AI-billing contexts (personal + teams) with live credit balances.
export const { GET } = createProxy("/api/v1/teams/my-contexts", ["GET"]);
