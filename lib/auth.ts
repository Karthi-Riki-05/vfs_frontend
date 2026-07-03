import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import LinkedInProvider from "next-auth/providers/linkedin";
import FacebookProvider from "next-auth/providers/facebook";
import CredentialsProvider from "next-auth/providers/credentials";
import axios from "axios";

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
    async signIn({ user, account }) {
      // Sync OAuth users to backend database
      if (account && account.provider !== "credentials") {
        try {
          const backendUrl =
            process.env.BACKEND_URL || "http://vc-backend:5000";
          const response = await axios.post(
            `${backendUrl}/api/v1/auth/oauth-sync`,
            {
              email: user.email,
              name: user.name,
              image: user.image,
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              accountType: account.type || "oauth",
            },
          );
          if (response.data?.success && response.data?.data) {
            const data = response.data.data;
            // Block super_admin accounts from using the OAuth login path
            if (data.role === "super_admin") return false;
            (user as any).backendId = data.id;
            (user as any).role = data.role;
            (user as any).hasPro = data.hasPro;
            (user as any).currentVersion = data.currentVersion;
            (user as any).hasTeamAccess = data.hasTeamAccess;
          }
        } catch (error) {
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
        // Credentials: honor remember-me checkbox. OAuth: always 30-day session.
        const rememberMe =
          (user as any).remember === true || !!(user as any).backendId;
        token.exp =
          Math.floor(Date.now() / 1000) +
          (rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60);
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
    maxAge: 30 * 24 * 60 * 60, // 30-day cookie ceiling; real cutoff is token.exp
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30-day ceiling; remember-me sets token.exp
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
