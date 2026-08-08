"use client";

import { useSession } from "next-auth/react";
import api from "@/lib/axios";
import { createSharedResource } from "@/lib/sharedResource";

export interface CurrentUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  photo?: string | null;
  role?: string | null;
  [k: string]: any;
}

/**
 * The signed-in user's live record (OPT-3).
 *
 * `Header.tsx` and `Sidebar.tsx` each ran their own `GET /users/me` on mount for
 * the same reason — the avatar lives on the user row, not in the NextAuth JWT,
 * so the session image goes stale after an upload. Two components, two
 * identical requests, doubled again by StrictMode in dev: 6 per dashboard load.
 * They now share one.
 *
 * This is the CLIENT-side fetch. It is unrelated to the server-side refresh in
 * `lib/auth.ts` (which feeds entitlements into the JWT and has its own
 * per-user single-flight) — same endpoint, different caller, different purpose.
 */
const resource = createSharedResource<CurrentUser>(
  "users/me",
  async () => {
    const res = await api.get("/users/me");
    return res.data?.data || res.data || {};
  },
  // The Settings page dispatches this after an avatar upload. One listener for
  // the store: the header and the sidebar both re-render from the same refetch.
  ["userAvatarChanged"],
);

export function useCurrentUser() {
  const { data: session } = useSession();
  const key = ((session?.user as any)?.id ||
    (session?.user as any)?.email ||
    null) as string | null;

  return resource.use(key);
}

/** Avatar url resolved the way the whole app resolves it: OAuth field, then upload. */
export function resolveAvatar(u: CurrentUser | null): string | null {
  if (!u) return null;
  return (u.image as string) || (u.photo as string) || null;
}

export const __currentUserResource = resource;
