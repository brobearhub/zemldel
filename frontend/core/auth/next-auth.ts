import "server-only";

import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { AuthMembership, AuthorizedUser } from "@/core/auth/authorization";
import {
  BackendApiError,
  fetchBackendJson,
  fetchBackendJsonAsUser,
} from "@/shared/api/backend/server";

type UserAuthContext = AuthorizedUser;

async function getUserAuthContext(userId: string): Promise<UserAuthContext | null> {
  try {
    return await fetchBackendJsonAsUser<UserAuthContext>("/auth/context", userId);
  } catch (error) {
    if (error instanceof BackendApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

function assignAuthContext(token: Record<string, unknown>, user: UserAuthContext) {
  token.id = user.id;
  token.name = user.name;
  token.email = user.email;
  token.image = user.image;
  token.systemRole = user.systemRole;
  token.activeProviderId = user.activeProviderId;
  token.customerCity = user.customerCity;
  token.memberships = user.memberships;
  token.linkedAuthProviders = user.linkedAuthProviders ?? [];
  token.stepUpVerifiedAt = user.stepUpVerifiedAt ?? {};
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/signin",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Пароль", type: "password" },
      },
      async authorize(credentials) {
        const email =
          typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password) return null;

        try {
          return await fetchBackendJson<UserAuthContext>("/auth/login", {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({ email, password }),
          });
        } catch (error) {
          if (error instanceof BackendApiError && error.status === 401) {
            return null;
          }
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        assignAuthContext(token as Record<string, unknown>, user as UserAuthContext);
      } else if (token.sub) {
        const authUser = await getUserAuthContext(token.sub);
        if (authUser) {
          assignAuthContext(token as Record<string, unknown>, authUser);
        }
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : "";
        session.user.name = typeof token.name === "string" ? token.name : null;
        session.user.email = typeof token.email === "string" ? token.email : null;
        session.user.image = typeof token.image === "string" ? token.image : null;
        session.user.systemRole = token.systemRole === "PLATFORM_ADMIN" ? "PLATFORM_ADMIN" : "CUSTOMER";
        session.user.activeProviderId =
          typeof token.activeProviderId === "string" ? token.activeProviderId : null;
        session.user.customerCity =
          typeof token.customerCity === "object" && token.customerCity
            ? (token.customerCity as UserAuthContext["customerCity"])
            : null;
        session.user.memberships = Array.isArray(token.memberships) ? (token.memberships as AuthMembership[]) : [];
        session.user.linkedAuthProviders = Array.isArray(token.linkedAuthProviders)
          ? (token.linkedAuthProviders as UserAuthContext["linkedAuthProviders"])
          : [];
        session.user.stepUpVerifiedAt =
          typeof token.stepUpVerifiedAt === "object" && token.stepUpVerifiedAt
            ? (token.stepUpVerifiedAt as UserAuthContext["stepUpVerifiedAt"])
            : {};
      }
      return session;
    },
  },
};

export function getServerAuthSession() {
  return getServerSession(authOptions);
}

