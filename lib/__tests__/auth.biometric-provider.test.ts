// @vitest-environment node
//
// Server-side provider config — node is the faithful environment, matching
// auth.session-lifetime.test.ts.

import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("axios", () => {
  const post = vi.fn();
  return { default: { post }, post };
});

import axios from "axios";

/**
 * The `biometric` CredentialsProvider is the seam that turns a fingerprint
 * unlock back into a real NextAuth session. Everything here guards a way that
 * seam could quietly become a hole:
 *
 *  * a missing / rejected ticket must NOT yield a session;
 *  * the provider must never be mistaken for OAuth by the signIn callback,
 *    which would push a fully-validated login through oauth-sync;
 *  * the shell has no remember-me checkbox, so the session must not silently
 *    fall back to the website's 24h rule.
 */

type Provider = {
  id: string;
  type: string;
  authorize?: (creds: any, req?: any) => Promise<any>;
};

/**
 * next-auth v4's `Credentials()` factory hardcodes `id: "credentials"` and
 * nests everything you passed under a separate `options` key. The real id and
 * authorize only appear after `core/lib/providers.js#parseProviders` merges
 * them back (`userOptions?.id ?? rest.id`).
 *
 * So reading `authOptions.providers` raw shows BOTH credentials providers as
 * "credentials" — misleading, and the reason two of them coexist happily at
 * runtime. Normalise the same way next-auth does, or these tests assert
 * against a shape that never reaches the server.
 */
function normalize(raw: any[]): Provider[] {
  return raw.map((p) => ({ ...p, ...(p.options ?? {}) }));
}

let providers: Provider[];
let biometric: Provider;
let signInCb: any;

beforeAll(async () => {
  process.env.NEXTAUTH_SECRET = "test-biometric-secret";
  const { authOptions } = await import("@/lib/auth");
  providers = normalize(authOptions.providers as unknown as any[]);
  biometric = providers.find((p) => p.id === "biometric")!;
  signInCb = authOptions.callbacks!.signIn!;
});

beforeEach(() => {
  (axios.post as any).mockReset();
});

describe("biometric provider — registration", () => {
  it("is registered alongside the password provider, with a distinct id", () => {
    expect(biometric).toBeDefined();
    expect(biometric.type).toBe("credentials");
    // The password login must still be there — this is additive.
    expect(providers.some((p) => p.id === "credentials")).toBe(true);
    // Two credentials providers only coexist if their ids differ after
    // normalisation; a collision would make one unreachable.
    const credentialIds = providers
      .filter((p) => p.type === "credentials")
      .map((p) => p.id);
    expect(new Set(credentialIds).size).toBe(credentialIds.length);
  });
});

describe("biometric provider — authorize", () => {
  it("returns null when no ticket is supplied, without calling the backend", async () => {
    const result = await biometric.authorize!({}, {});
    expect(result).toBeNull();
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("redeems the ticket and returns the user", async () => {
    (axios.post as any).mockResolvedValue({
      data: {
        success: true,
        data: {
          id: "user-1",
          email: "a@b.com",
          name: "A",
          role: "Viewer",
          hasPro: false,
          currentVersion: "free",
          hasTeamAccess: false,
          token: "jwt",
        },
      },
    });

    const result = await biometric.authorize!({ ott: "ticket" }, {});

    expect(result).toMatchObject({ id: "user-1", email: "a@b.com" });
    const [url, body] = (axios.post as any).mock.calls[0];
    expect(url).toContain("/api/v1/auth/biometric/consume");
    expect(body).toEqual({ ott: "ticket" });
  });

  it("marks the session remembered — the shell has no checkbox", async () => {
    (axios.post as any).mockResolvedValue({
      data: { success: true, data: { id: "user-1", role: "Viewer" } },
    });

    const result = await biometric.authorize!({ ott: "ticket" }, {});

    // Without this the WebView would drop to the website's 24h rule.
    expect((result as any).remember).toBe(true);
  });

  it("returns null on a 2xx with no usable body", async () => {
    (axios.post as any).mockResolvedValue({ data: { success: false } });
    const result = await biometric.authorize!({ ott: "ticket" }, {});
    expect(result).toBeNull();
  });

  it("surfaces a spent or expired ticket as an error, never a session", async () => {
    (axios.post as any).mockRejectedValue({
      response: {
        data: { error: { code: "INVALID_TOKEN", message: "Invalid or expired token" } },
      },
    });

    await expect(biometric.authorize!({ ott: "spent" }, {})).rejects.toThrow(
      /invalid or expired/i,
    );
  });

  it("surfaces a suspended account rather than logging it in", async () => {
    (axios.post as any).mockRejectedValue({
      response: {
        data: { error: { code: "ACCOUNT_INACTIVE", message: "Account is inactive" } },
      },
    });

    await expect(biometric.authorize!({ ott: "t" }, {})).rejects.toThrow(
      /inactive/i,
    );
  });
});

describe("signIn callback", () => {
  it("does NOT push a biometric login through oauth-sync", async () => {
    const ok = await signInCb({
      user: { id: "user-1", email: "a@b.com" },
      account: { provider: "biometric", type: "credentials" },
      profile: undefined,
    });

    // oauth-sync is an axios.post; a biometric login must never trigger it.
    expect(axios.post).not.toHaveBeenCalled();
    expect(ok).toBe(true);
  });

  it("still skips oauth-sync for the password provider", async () => {
    const ok = await signInCb({
      user: { id: "user-1", email: "a@b.com" },
      account: { provider: "credentials", type: "credentials" },
      profile: undefined,
    });

    expect(axios.post).not.toHaveBeenCalled();
    expect(ok).toBe(true);
  });
});
