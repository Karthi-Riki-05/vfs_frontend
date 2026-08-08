import { createProxy } from "@/lib/proxy";

// bug-111: the backend has exposed POST /shapes/:id/copy all along, but this
// proxy did not exist — so the browser's POST to /api/shapes/<id>/copy hit
// Next, found no handler, and 404'd. The UI reported "Failed to copy shape"
// for a route that works perfectly when called directly.
//
// Every backend route needs a Next proxy sibling; this is the same class of
// gap as the ?download=1 query-string loss recorded in the session log.
const { POST } = createProxy("/api/shapes/:id/copy", ["POST"]);
export { POST };
