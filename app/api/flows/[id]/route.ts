import { createProxy } from "@/lib/proxy";

/**
 * Single-flow proxy: GET / PUT / DELETE `/api/flows/:id`.
 *
 * This route was hand-rolled and forwarded ONLY the Authorization header, so
 * `X-App-Context` and `X-Workspace-Context` — both set by the browser's axios
 * interceptor — were dropped on the way to the backend. The backend then fell
 * back to `req.user.currentVersion`, which is the caller's strongest plan, not
 * the app they are looking at.
 *
 * That silently broke shared flows. A FlowShare is tagged with the context it
 * was created in, so a `team` share opened by a recipient whose
 * currentVersion is `free` (or `pro`) resolved to the wrong context, matched no
 * share, and returned 404 — the editor sat on "Loading…" forever. The owner
 * never saw it, because the owner path does not consult the share at all.
 *
 * `createProxy` forwards both headers (and the legacy `X-Team-Context`), signs
 * the token the same way as every other route, and targets the canonical
 * `/api/v1` mount instead of the legacy `/api` alias.
 */
export const { GET, PUT, DELETE } = createProxy("/api/v1/flows/:id", [
  "GET",
  "PUT",
  "DELETE",
]);
