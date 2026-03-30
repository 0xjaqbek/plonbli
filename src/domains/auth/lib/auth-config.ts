import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import Facebook from "next-auth/providers/facebook";
import { eq, and } from "drizzle-orm";
import { db } from "@/shared/db";
import { users, authAccounts } from "@/shared/db/schema";
import { verifyPassword } from "./passwords";
import { loginSchema } from "../schemas/validation";

export const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await db.query.users.findFirst({
          where: eq(users.email, email),
        });

        if (!user || !user.passwordHash) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatar,
        };
      },
    }),
    Google,
    Facebook,
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (!account || account.provider === "credentials") return true;
      if (!user.email) return false;

      const email = user.email;
      const provider = account.provider;
      const providerAccountId = account.providerAccountId;

      // Check if this OAuth account is already linked
      const existing = await db.query.authAccounts.findFirst({
        where: and(
          eq(authAccounts.provider, provider),
          eq(authAccounts.providerAccountId, providerAccountId)
        ),
      });

      if (existing) {
        // Already linked — update user.id so JWT gets the DB id
        user.id = existing.userId;
        return true;
      }

      // Check if a user with this email exists
      let dbUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (!dbUser) {
        // Create new user
        const [created] = await db
          .insert(users)
          .values({
            email,
            name: user.name ?? email.split("@")[0],
            avatar: user.image ?? null,
            role: "CONSUMER",
          })
          .returning();
        dbUser = created;
      }

      // Link OAuth account
      await db.insert(authAccounts).values({
        provider,
        providerAccountId,
        userId: dbUser.id,
      });

      user.id = dbUser.id;
      return true;
    },
    async session({ session, token }) {
      if (token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
};
