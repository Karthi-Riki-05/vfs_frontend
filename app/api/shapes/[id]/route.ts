import { createProxy } from "@/lib/proxy";

/**
 * Single-shape proxy: GET / PUT / DELETE `/api/shapes/:id`.
 *
 * Was hand-rolled and forwarded only Authorization, so `X-App-Context` and
 * `X-Workspace-Context` never reached the backend and shapes resolved against
 * the caller's currentVersion instead of the app they are working in. Same
 * defect as `app/api/flows/[id]` — see that route's note.
 */
export const { GET, PUT, DELETE } = createProxy("/api/v1/shapes/:id", [
  "GET",
  "PUT",
  "DELETE",
]);
