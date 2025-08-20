import type { NextAuthOptions, User } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

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

const isProd = process.env.NODE_ENV === "production";
const devBypass = !isProd || process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";
const enableEmailAuth = process.env.NEXT_PUBLIC_ENABLE_EMAIL_AUTH === "true";

const hasGoogle = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
const baseProviders = [
  ...(hasGoogle
    ? [
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        }),
      ]
    : []),
  // Credentials: allowed in dev, and optionally in prod if explicitly enabled via env.
  CredentialsProvider({
    credentials: {
      email: { label: "Email", type: "text" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = (credentials?.email || "").toString().toLowerCase().trim();
      const password = (credentials?.password || "").toString();
      // Allow credentials in dev bypass, or when explicitly enabled for prod
      if (devBypass || (isProd && enableEmailAuth)) {
        // For demo: allow any password for rouge emails, or require 'test123' for others
        if (/rouge/.test(email)) {
          return { id: "dev", email } as unknown as User;
        }
        if (password === "test123") {
          return { id: "dev", email } as unknown as User;
        }
        throw new Error("Invalid password");
      }
      // In production, deny credentials-based auth
      return null;
    },
  }),
];

export const authOptions: NextAuthOptions = {
  providers: baseProviders as unknown as NextAuthOptions["providers"],
  // Require secret in production; provide a safe dev default locally only
  secret: isProd ? (process.env.NEXTAUTH_SECRET as string) : process.env.NEXTAUTH_SECRET || "dev-secret",
  callbacks: {
    async signIn({ user }) {
      // Dev bypass sign-in checks
      if (devBypass) return true;
      const email = user.email?.toLowerCase().trim();
      if (!email) return "/unauthorized";
      return isAllowedEmail(email) ? true : "/unauthorized";
    },
    async redirect({ url, baseUrl }) {
      // Always redirect to /Home after login
      return baseUrl + "/Home";
    },
  },
};
