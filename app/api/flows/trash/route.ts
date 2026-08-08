import { createProxy } from '@/lib/proxy';

/**
 * GET  — list the trash.
 * DELETE — empty it.
 *
 * DELETE was missing. The trash page calls `api.delete("/flows/trash")` and the
 * backend declares `router.delete("/trash", …)` specifically so it isn't
 * swallowed by `/:id`, but this proxy exported only GET — and Next matches the
 * static `trash` segment before `[id]`, so the request 405'd here and never
 * reached Express. Users saw "Failed to empty trash".
 *
 * Shipped together with the emptyTrash scope fix (flow.service): until that
 * landed, this broken button was the only thing standing between a workspace
 * owner and a hard delete of their members' trashed flows.
 */
const { GET, DELETE } = createProxy('/api/v1/flows/trash', ['GET', 'DELETE']);
export { GET, DELETE };
