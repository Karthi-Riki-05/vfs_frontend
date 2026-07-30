import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import { encode as defaultJwtEncode } from "next-auth/jwt";
import axios from "axios";

// Session lifetimes. "Remember me" (and every OAuth login) buys 30 days;
// otherwise a session lasts a day. Both are ROLLING — `jwt.encode` below runs
// on every session read, so the clock restarts each time the user is active.
const REMEMBERED_MAX_AGE = 30 * 24 * 60 * 60;
const DEFAULT_MAX_AGE = 24 * 60 * 60;

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
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
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Sync OAuth users to backend database
      if (account && account.provider !== "credentials") {
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
        try {
          const backendUrl =
            process.env.BACKEND_URL || "http://vc-backend:5000";
          const jwt = require("jsonwebtoken");
          const tempToken = jwt.sign(
            { id: token.id },
            process.env.NEXTAUTH_SECRET!,
            { expiresIn: "30s" },
          );
          const res = await axios.get(`${backendUrl}/api/v1/users/me`, {
            headers: { Authorization: `Bearer ${tempToken}` },
          });
          if (res.data?.success && res.data?.data) {
            token.hasPro = res.data.data.hasPro;
            token.currentVersion = res.data.data.currentVersion;
            token.hasTeamAccess = res.data.data.hasTeamAccess ?? false;
          }
          token.lastRefresh = Date.now();
        } catch (err) {
          console.error("Failed to refresh user data on session update:", err);
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
