import { createProxy } from "@/lib/proxy";
const { DELETE } = createProxy("/api/v1/teams/invites/:id", ["DELETE"]);
export { DELETE };
