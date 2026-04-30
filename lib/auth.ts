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
      },
      async authorize(credentials) {
        try {
          // Call Express Backend for validation
          // Use internal docker network url for server-side calls
          const backendUrl =
            process.env.BACKEND_URL || "http://vc-backend:5000";
          const response = await axios.post(`${backendUrl}/api/auth/validate`, {
            email: credentials?.email,
            password: credentials?.password,
          });

          if (response.data?.success && response.data?.data) {
            return response.data.data;
          }
          return null;
        } catch (error: any) {
          const code = error?.response?.data?.error?.code;
          const msg = error?.response?.data?.error?.message;
          if (code === "EMAIL_NOT_VERIFIED" || code === "ACCOUNT_INACTIVE" || code === "INVALID_CREDENTIALS") {
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
            `${backendUrl}/api/auth/oauth-sync`,
            {
              email: user.email,
              name: user.name,
              image: user.image,
              provider: account.provider,
            },
          );
          if (response.data?.success && response.data?.data) {
            // Store backend user ID and role on the user object for the jwt callback
            (user as any).backendId = response.data.data.id;
            (user as any).role = response.data.data.role;
            (user as any).hasPro = response.data.data.hasPro;
            (user as any).currentVersion = response.data.data.currentVersion;
          }
        } catch (error) {
          console.error("OAuth sync error:", error);
          return false;
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
      }

      // Re-fetch user data from DB when session is explicitly updated
      if (trigger === "update" && token.id) {
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
          }
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
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
