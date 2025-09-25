import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const envEmails = (process.env.ALLOWED_EMAILS || "").split(",").map(s => s.trim()).filter(Boolean);
const envDomains = (process.env.ALLOWED_DOMAINS || "").split(",").map(s => s.trim()).filter(Boolean);
const envPatterns = (process.env.ALLOWED_EMAIL_PATTERNS || "").split(",").map(s => s.trim()).filter(Boolean);
export const allowedEmails = envEmails;
export const allowedDomains = envDomains;
export const allowedEmailPatterns = envPatterns.map(p => {
  try { return new RegExp(p); } catch { return /^$/; }
});

export function isAllowedEmail(email: string): boolean {
  const e = email.toLowerCase().trim();
  // Special-case allow: emails whose local-part ends with '.rouge' at gmail
  // Example: john.rouge@gmail.com
  if (e.endsWith('.rouge@gmail.com')) return true;
  // If no allowlist configured, allow any authenticated email (production will set envs)
  if (allowedEmails.length === 0 && allowedDomains.length === 0 && allowedEmailPatterns.length === 0) {
    return true;
  }
  if (allowedEmails.includes(e)) return true;
  if (allowedDomains.some((d) => e.endsWith(`@${d}`))) return true;
  if (allowedEmailPatterns.some((p) => p.test(e))) return true;
  return false;
}

type EmailAuthUser = {
  email: string;
  secret: string;
  isHash: boolean;
  name?: string;
};

function parseEmailAuthUsers(raw: string | undefined | null): EmailAuthUser[] {
  if (!raw) return [];

  const entries = raw
    .split(/[;\n]/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const users: EmailAuthUser[] = [];

  for (const entry of entries) {
    const parts = entry.split(":");
    const emailPart = parts.shift();
    const secretPart = parts.shift();
    const namePart = parts.length > 0 ? parts.join(":") : undefined;

    if (!emailPart || !secretPart) {
      continue;
    }

    const email = emailPart.toLowerCase().trim();
    if (!email) {
      continue;
    }

    const secret = secretPart.trim();

    users.push({
      email,
      secret,
      isHash: secret.startsWith("$2"),
      name: namePart?.trim() || undefined,
    });
  }

  return users;
}

const emailAuthUsers = parseEmailAuthUsers(process.env.EMAIL_AUTH_USERS);
const isProd = process.env.NODE_ENV === "production";
const devBypass = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";
const googleConfigured = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
const allowEmailAuthToggle =
  devBypass || process.env.NEXT_PUBLIC_ENABLE_EMAIL_AUTH === "true" || (!googleConfigured && !isProd);
const hasConfiguredEmailUsers = emailAuthUsers.length > 0;
const enableCredentialsProvider = allowEmailAuthToggle && (hasConfiguredEmailUsers || devBypass || !googleConfigured);

const providers: NextAuthOptions["providers"] = [];

if (googleConfigured) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  );
}

if (enableCredentialsProvider) {
  providers.push(
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password || "";

        if (!email || !password) {
          throw new Error("CredentialsSignin");
        }

        if (!devBypass && !isAllowedEmail(email)) {
          throw new Error("AccessDenied");
        }

        if (devBypass) {
          return {
            id: email,
            email,
            name: email.split("@")[0] || "Dev User",
          };
        }

        if (!hasConfiguredEmailUsers) {
          throw new Error("EmailSignInDisabled");
        }

        const userRecord = emailAuthUsers.find((user) => user.email === email);
        if (!userRecord) {
          throw new Error("CredentialsSignin");
        }

        const passwordMatches = userRecord.isHash
          ? await bcrypt.compare(password, userRecord.secret)
          : userRecord.secret === password;

        if (!passwordMatches) {
          throw new Error("CredentialsSignin");
        }

        return {
          id: userRecord.email,
          email: userRecord.email,
          name: userRecord.name || userRecord.email.split("@")[0],
        };
      },
    }),
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  // Require secret in production; provide a safe dev default locally only
  secret: isProd
    ? (process.env.NEXTAUTH_SECRET as string)
    : process.env.NEXTAUTH_SECRET || randomUUID(),
  callbacks: {
    async signIn({ user }) {
      // Dev bypass sign-in checks
      if (devBypass) return true;
      const email = user.email?.toLowerCase().trim();
      if (!email) return "/unauthorized";
      return isAllowedEmail(email) ? true : "/unauthorized";
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Always redirect to /home after login
      return baseUrl + "/home";
    },
  },
};
