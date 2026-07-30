// @vitest-environment node
//
// Must run outside jsdom: jose checks `plaintext instanceof Uint8Array`, and
// jsdom's TextEncoder returns one from a different realm, so encryption fails
// with "plaintext must be an instance of Uint8Array". This is server-side code
// anyway — node is the faithful environment for it.

import { beforeAll, describe, expect, it } from "vitest";
import { decode } from "next-auth/jwt";

/**
 * Session lifetime is enforced by the custom `jwt.encode` in `lib/auth.ts`,
 * NOT by anything the `jwt` callback puts on the payload.
 *
 * The previous implementation set `token.exp` by hand in the callback. That
 * silently never worked — next-auth's `encode()` finishes with
 * `.setExpirationTime(now() + maxAge)` and jose overwrites the payload's
 * `exp`, so every session was 30 days regardless of remember-me. These tests
 * pin the behaviour to the JWE's real `exp` (what next-auth actually reads
 * back) so that failure mode cannot return unnoticed.
 */

const SECRET = "test-session-lifetime-secret";
const DAY = 24 * 60 * 60;
const THIRTY_DAYS = 30 * DAY;

// `authOptions` reads env at module scope; set it before the dynamic import.
let encode: NonNullable<
  NonNullable<typeof import("@/lib/auth").authOptions.jwt>["encode"]
>;

beforeAll(async () => {
  process.env.NEXTAUTH_SECRET = SECRET;
  const { authOptions } = await import("@/lib/auth");
  encode = authOptions.jwt!.encode!;
});

/** Round-trip a token and return its real expiry, in seconds from now. */
async function expiresInSeconds(token: Record<string, unknown>) {
  const jwt = await encode({ token, secret: SECRET, maxAge: THIRTY_DAYS });
  const decoded = await decode({ token: jwt, secret: SECRET });
  expect(decoded?.exp).toBeTypeOf("number");
  return (decoded!.exp as number) - Math.floor(Date.now() / 1000);
}

// Allow a couple of seconds of drift between encode and assertion.
const near = (actual: number, expected: number) =>
  Math.abs(actual - expected) <= 5;

describe("session lifetime (jwt.encode)", () => {
  it("gives a non-remembered session 24 hours", async () => {
    const ttl = await expiresInSeconds({ id: "u1", remember: false });
    expect(near(ttl, DAY)).toBe(true);
  });

  it("gives a remembered session 30 days", async () => {
    const ttl = await expiresInSeconds({ id: "u1", remember: true });
    expect(near(ttl, THIRTY_DAYS)).toBe(true);
  });

  it("treats a missing remember flag as non-remembered", async () => {
    const ttl = await expiresInSeconds({ id: "u1" });
    expect(near(ttl, DAY)).toBe(true);
  });

  it("ignores a hand-set token.exp — encode's maxAge is the only lever", async () => {
    // The exact regression: a callback-set `exp` must not win.
    const ttl = await expiresInSeconds({
      id: "u1",
      remember: true,
      exp: Math.floor(Date.now() / 1000) + 60,
    });
    expect(near(ttl, THIRTY_DAYS)).toBe(true);
  });

  it("rolls the clock forward on re-encode, so an active user is not cut off", async () => {
    // Simulate a session read 12h into a 24h session: the token is re-encoded
    // and must come back with a full day again, not the 12h remainder.
    const issued = { id: "u1", remember: false, iat: Math.floor(Date.now() / 1000) - 12 * 60 * 60 };
    const ttl = await expiresInSeconds(issued);
    expect(near(ttl, DAY)).toBe(true);
  });
});
