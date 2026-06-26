import { createProxy } from "@/lib/proxy";
const { PUT } = createProxy("/api/v1/teams/:id/members/:uid/role", ["PUT"]);
export { PUT };
