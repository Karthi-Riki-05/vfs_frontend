import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";
import FacebookProvider from "next-auth/providers/facebook";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";
import { encode as defaultJwtEncode } from "next-auth/jwt";
import axios from "axios";
import jwt from "jsonwebtoken";

/**
 * Apple ID's OAuth `client_secret` isn't a static string like the other
 * providers — Apple requires a JWT signed with the ES256 private key you
 * download once from Apple Developer (Certificates, Identifiers & Profiles →
 * Keys), valid for at most 6 months (Apple's own cap). Rather than hand-mint
 * one and re-deploy every few months, generate it fresh at process start —
 * cheap, and this module is only evaluated once per server process.
 *
 * Required env vars (App Store Guideline 4.8 compliance — added 2026-08-18,
 * since Google/Facebook/LinkedIn login already existed without it):
 *   APPLE_CLIENT_ID   — the Services ID (e.g. com.valuecharts.web.signin)
 *   APPLE_TEAM_ID     — Apple Developer Team ID (same 5HQ828K78T used by iOS)
 *   APPLE_KEY_ID      — the Key ID shown next to the downloaded .p8 key
 *   APPLE_PRIVATE_KEY — contents of the .p8 file (PEM, keep the newlines —
 *                       store as \n-escaped in .env like FIREBASE_PRIVATE_KEY)
 */
function generateAppleClientSecret(): string {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const clientId = process.env.APPLE_CLIENT_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!teamId || !keyId || !clientId || !privateKey) {
    // Missing config shouldn't crash the whole auth module for every other
    // provider — return an empty secret so Apple sign-in fails on its own
    // (NextAuth reports an OAuth error) rather than breaking Google/Facebook.
    console.error(
      "Apple Sign-In not configured: missing APPLE_TEAM_ID / APPLE_KEY_ID / " +
        "APPLE_CLIENT_ID / APPLE_PRIVATE_KEY",
    );
    return "";
  }

  return jwt.sign(
    {
      iss: teamId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days — well under Apple's 6-month cap, refreshed on every process restart
      aud: "https://appleid.apple.com",
      sub: clientId,
    },
    privateKey,
    { algorithm: "ES256", keyid: keyId },
  );
}

// Session lifetimes. "Remember me" (and every OAuth login) buys 30 days;
// otherwise a session lasts a day. Both are ROLLING — `jwt.encode` below runs
// on every session read, so the clock restarts each time the user is active.
const REMEMBERED_MAX_AGE = 30 * 24 * 60 * 60;
const DEFAULT_MAX_AGE = 24 * 60 * 60;

/**
 * In-flight entitlement refreshes, ONE PER USER (OPT-1).
 *
 * ⚠️ The key is the user id and must stay that way. A single shared promise
 * would resolve one user's entitlements into another user's signed JWT.
 *
 * Process-local: this dedupes within a Node instance, which is the whole deploy
 * today (one container). Behind several instances each would still make one
 * call — a 90% cut rather than 100%, and still correct.
 */
const userRefreshInflight = new Map<
  string,
  Promise<{
    hasPro?: boolean;
    currentVersion?: string;
    hasTeamAccess?: boolean;
  } | null>
>();

/** Timeout so one hung backend call cannot park every waiting session request. */
const REFRESH_TIMEOUT_MS = 8000;

/**
 * Server-side result cache — the other half of OPT-1, and the half that
 * actually matters.
 *
 * The `token.lastRefresh` throttle in the jwt callback CANNOT work on its own.
 * `getServerSession()` runs the jwt callback but has no response to attach a
 * Set-Cookie to, so any `lastRefresh` it writes is discarded. And 17 API proxy
 * routes call `getServerSession()` — so once the 5-minute window lapses, EVERY
 * proxied request re-ran the backend fetch, permanently, until an
 * /api/auth/session response happened to rewrite the cookie.
 *
 * Measured after adding in-flight dedupe alone: still 43 backend calls in two
 * minutes, in bursts of 2–4 per second. In-flight dedupe only collapses calls
 * that OVERLAP; these were sequential, each finishing before the next began.
 *
 * A process-local TTL cache is what the cookie was supposed to provide. Same
 * staleness bound as the intended design (5 min), now actually enforced.
 */
const userRefreshCache = new Map<string, { at: number; data: any }>();
const REFRESH_TTL_MS = 5 * 60 * 1000;
/** Bound the map so a long-lived server with many users cannot grow forever. */
const REFRESH_CACHE_MAX = 500;

export async function refreshUserOnce(userId: string, force = false) {
  if (!force) {
    const hit = userRefreshCache.get(userId);
    if (hit && Date.now() - hit.at < REFRESH_TTL_MS) return hit.data;
  }

  const existing = userRefreshInflight.get(userId);
  if (existing) return existing;

  const p = (async () => {
    try {
      const backendUrl = process.env.BACKEND_URL || "http://vc-backend:5000";
      const jwt = require("jsonwebtoken");
      const tempToken = jwt.sign({ id: userId }, process.env.NEXTAUTH_SECRET!, {
        expiresIn: "30s",
      });
      const res = await axios.get(`${backendUrl}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${tempToken}` },
        timeout: REFRESH_TIMEOUT_MS,
      });
      if (res.data?.success && res.data?.data) {
        if (userRefreshCache.size >= REFRESH_CACHE_MAX) {
          // Cheap eviction: drop the oldest entry. This is a freshness cache,
          // not a correctness store — losing one only costs a refetch.
          let oldestKey: string | null = null;
          let oldestAt = Infinity;
          userRefreshCache.forEach((v, k) => {
            if (v.at < oldestAt) {
              oldestAt = v.at;
              oldestKey = k;
            }
          });
          if (oldestKey) userRefreshCache.delete(oldestKey);
        }
        userRefreshCache.set(userId, { at: Date.now(), data: res.data.data });
        return res.data.data;
      }
      return null;
    } catch (err) {
      // Caught INSIDE the shared promise: every awaiting caller gets `null` and
      // keeps its existing token values, instead of the rejection propagating
      // into N separate session requests.
      console.error("Failed to refresh user data on session update:", err);
      return null;
    } finally {
      // Always clear, success or failure, so a failed refresh does not pin a
      // permanently-rejected promise in the map.
      userRefreshInflight.delete(userId);
    }
  })();

  userRefreshInflight.set(userId, p);
  return p;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // App Store Guideline 4.8: offering Google/Facebook/LinkedIn login without
    // also offering Sign in with Apple is a real rejection reason. Flows
    // through the exact same generic oauth-sync path as every other provider
    // below (see the signIn callback) — no backend change needed, `provider`
    // there is a free-form string, not an enum.
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: generateAppleClientSecret(),
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      issuer: "https://www.linkedin.com/oauth",
      wellKnown:
        "https://www.linkedin.com/oauth/.well-known/openid-configuration",
      authorization: {
        params: { scope: "openid profile email" },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
        remember: { label: "Remember me", type: "text", optional: true },
      },
      async authorize(credentials) {
        try {
          // Call Express Backend for validation
          // Use internal docker network url for server-side calls
          const backendUrl =
            process.env.BACKEND_URL || "http://vc-backend:5000";
          const response = await axios.post(
            `${backendUrl}/api/v1/auth/validate`,
            {
              email: credentials?.email,
              password: credentials?.password,
            },
          );

          if (response.data?.success && response.data?.data) {
            return {
              ...response.data.data,
              remember: credentials?.remember === "true",
            };
          }
          return null;
        } catch (error: any) {
          const code = error?.response?.data?.error?.code;
          const msg = error?.response?.data?.error?.message;
          if (
            code === "EMAIL_NOT_VERIFIED" ||
            code === "ACCOUNT_INACTIVE" ||
            code === "INVALID_CREDENTIALS"
          ) {
            throw new Error(msg || "Login failed");
          }
          console.error("Auth proxy error:", error);
          throw new Error(msg || "An unexpected error occurred during login");
        }
      },
    }),
    // Biometric login for the native shell (fingerprint / Face ID).
    //
    // The shell cannot hand us a password — it holds a device token in
    // biometric-gated secure storage, which it exchanges for a one-time ticket
    // after the OS confirms the user. This provider redeems that ticket, so
    // NextAuth issues its session cookie through exactly the same path as a
    // password login. Nothing is forged and the cookie never leaves the
    // browser's control. See docs/be-auth-biometric.md.
    //
    // The ticket is single-use and lives ~60 seconds; the backend re-checks
    // account state (deleted / suspended / unverified) before honouring it, so
    // an enrolled phone cannot outlive the account's right to log in.
    CredentialsProvider({
      id: "biometric",
      name: "Biometric",
      credentials: {
        ott: { label: "One-time token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.ott) return null;
        try {
          const backendUrl =
            process.env.BACKEND_URL || "http://vc-backend:5000";
          const response = await axios.post(
            `${backendUrl}/api/v1/auth/biometric/consume`,
            { ott: credentials.ott },
          );

          if (response.data?.success && response.data?.data) {
            return {
              ...response.data.data,
              // The shell is a WebView with no remember-me checkbox. Mirror
              // what LoginForm does there (see the jwt callback's note) so a
              // biometric session lasts as long as a password one.
              remember: true,
            };
          }
          return null;
        } catch (error: any) {
          const code = error?.response?.data?.error?.code;
          const msg = error?.response?.data?.error?.message;
          // Surface the states the app can act on: re-enrol, or send the user
          // back to a password login.
          if (
            code === "EMAIL_NOT_VERIFIED" ||
            code === "ACCOUNT_INACTIVE" ||
            code === "USER_DEACTIVATED" ||
            code === "INVALID_TOKEN"
          ) {
            throw new Error(msg || "Biometric login failed");
          }
          console.error("Biometric auth error:", error);
          throw new Error(msg || "An unexpected error occurred during login");
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Sync OAuth users to backend database.
      //
      // `biometric` is excluded explicitly: it is a CredentialsProvider, but it
      // carries its own id, so a bare `!== "credentials"` test would class it as
      // OAuth and push it through oauth-sync — which would try to create or
      // re-key an account from a login that has already been fully validated
      // by the backend. It needs no sync at all.
      if (
        account &&
        account.provider !== "credentials" &&
        account.provider !== "biometric"
      ) {
        try {
          const backendUrl =
            process.env.BACKEND_URL || "http://vc-backend:5000";
          // bug-082: forward the provider's own verified-email claim. Google and
          // LinkedIn assert it (LinkedIn as the string "true"); Facebook asserts
          // nothing, so it stays false and the backend refuses to treat the
          // address as an identity key.
          const rawVerified = (profile as any)?.email_verified;
          const response = await axios.post(
            `${backendUrl}/api/v1/auth/oauth-sync`,
            {
              email: user.email,
              name: user.name,
              image: user.image,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              accountType: account.type || "oauth",
              emailVerified: rawVerified === true || rawVerified === "true",
            },
            {
              // bug-083: the route is server-to-server only. Without this header
              // the backend 404s, so a missing secret fails closed rather than
              // leaving the endpoint open to anyone who can reach the API.
              headers: {
                "X-Internal-Auth": process.env.INTERNAL_API_SECRET || "",
              },
            },
          );
          if (response.data?.success && response.data?.data) {
            const data = response.data.data;
            // Block super_admin accounts from using the OAuth login path.
            // Defence in depth — the backend rejects them too (bug-082).
            if (data.role === "super_admin") return false;
            (user as any).backendId = data.id;
            (user as any).role = data.role;
            (user as any).hasPro = data.hasPro;
            (user as any).currentVersion = data.currentVersion;
            (user as any).hasTeamAccess = data.hasTeamAccess;
          } else {
            // 2xx without a usable body: do NOT fall through to a session keyed
            // on the provider's sub — that signs the user in to nothing.
            console.error("OAuth sync returned no data:", response.data);
            return "/login?error=OAuthSyncFailed";
          }
        } catch (error: any) {
          const code = error?.response?.data?.error?.code;
          if (
            code === "SOCIAL_EMAIL_NOT_VERIFIED" ||
            code === "ACCOUNT_INACTIVE" ||
            code === "USER_DEACTIVATED" ||
            code === "OAUTH_NOT_ALLOWED"
          ) {
            return `/login?error=${code}`;
          }
          console.error("OAuth sync error:", error);
          return "/login?error=OAuthBackendDown";
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger }) {
      if (user) {
        // For OAuth, use the backend ID; for credentials, user.id is already the backend ID
        token.id = (user as any).backendId || user.id;
        token.sub = (user as any).backendId || user.id;
        token.role = (user as any).role;
        token.hasPro = (user as any).hasPro;
        token.currentVersion = (user as any).currentVersion;
        token.hasTeamAccess = (user as any).hasTeamAccess ?? false;
        token.lastRefresh = Date.now();
        // Credentials: honor the remember-me checkbox. OAuth: always 30 days
        // (no checkbox to read). Mobile also lands here as `true` — LoginForm
        // forces `remember` on in a WebView, where there is no checkbox and a
        // 24h expiry would mean re-typing a password every day.
        //
        // This flag is the ONLY session-lifetime signal; `jwt.encode` below
        // reads it. Setting `token.exp` here would do nothing: next-auth's
        // `encode()` ends with `.setExpirationTime(now() + maxAge)` and jose
        // writes that straight over any `exp` already on the payload, which is
        // why the previous hand-rolled version of this silently never applied.
        token.remember =
          (user as any).remember === true || !!(user as any).backendId;
        return token;
      }

      // Entitlements (hasPro/currentVersion/hasTeamAccess) are otherwise
      // frozen at sign-in for the life of the session — up to 30 days with
      // "remember me". See bug-033. Re-fetch on an explicit session.update()
      // call, or automatically at most once per REFRESH_INTERVAL so a plan
      // change / subscription expiry is picked up without forcing a re-login.
      const REFRESH_INTERVAL_MS = 5 * 60 * 1000;
      const dueForRefresh =
        !token.lastRefresh ||
        Date.now() - (token.lastRefresh as number) > REFRESH_INTERVAL_MS;

      if ((trigger === "update" || dueForRefresh) && token.id) {
        // OPT-1 (2026-08-08): share ONE in-flight refresh per user.
        //
        // The 5-minute throttle above is written into the JWT cookie, so it only
        // stops SEQUENTIAL refreshes. A page load mounts many `useSession()`
        // consumers at once; they issue parallel /api/auth/session requests, and
        // every one of them evaluates `dueForRefresh` against a cookie that none
        // of them has updated yet. All of them then call the backend. Measured
        // on a real dashboard refresh: 47 × GET /users/me, arriving in bursts of
        // 5–6 in the same second — a third of ALL backend traffic for that load.
        //
        // Keyed by user id, never a bare module variable: a shared promise would
        // hand user B the entitlements resolved for user A and bake them into
        // B's signed token.
        // `trigger === "update"` is the explicit session.update() the purchase
        // flow calls — it MUST bypass the cache, or a user who just paid keeps
        // seeing the free tier for up to five minutes.
        const data = await refreshUserOnce(
          String(token.id),
          trigger === "update",
        );
        if (data) {
          token.hasPro = data.hasPro;
          token.currentVersion = data.currentVersion;
          token.hasTeamAccess = data.hasTeamAccess ?? false;
          token.lastRefresh = Date.now();
        } else {
          // Failed: keep the previous entitlement values (never downgrade on a
          // network blip) and leave `lastRefresh` alone so the next request
          // retries rather than waiting out the full 5 minutes.
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).hasPro = token.hasPro;
        (session.user as any).currentVersion = token.currentVersion;
        (session.user as any).hasTeamAccess = token.hasTeamAccess ?? false;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    // Cookie ceiling only. It stays at the longer of the two lifetimes because
    // it must still be able to carry a remembered session; a non-remembered
    // token expires inside the cookie after DEFAULT_MAX_AGE and simply stops
    // decoding, which next-auth treats as signed out.
    maxAge: REMEMBERED_MAX_AGE,
  },
  jwt: {
    maxAge: REMEMBERED_MAX_AGE,
    /**
     * Per-session expiry, keyed off the remember-me flag stamped in the `jwt`
     * callback. The stock `encode` applies a single static `maxAge` to
     * everyone — overriding it here is the only place the two lifetimes can
     * actually diverge, because `encode` sets the JWE `exp` last and wins over
     * anything the callbacks put on the payload.
     *
     * Runs on every session read, so both lifetimes are rolling: an active
     * user is never signed out mid-use, and the clock only runs down while
     * they are away. `decode` is left stock — an expired token throws there
     * and next-auth reads that as no session.
     */
    encode({ token, secret, salt }) {
      return defaultJwtEncode({
        token,
        secret,
        salt,
        maxAge: token?.remember ? REMEMBERED_MAX_AGE : DEFAULT_MAX_AGE,
      });
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
