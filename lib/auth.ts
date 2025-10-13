import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { randomUUID } from "crypto";
import {
  findUserByEmail,
  findUserByGoogleId,
  createUser,
  verifyPassword,
  updateLastLogin,
  isUserLocked,
  incrementFailedLoginAttempts,
  logLoginAttempt,
  isRougeEmail,
  getEmailRejectionReason,
} from "./auth/auth-service";

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
  // Special-case allow: emails whose local-part ends with '.rouge' at gmail and @rougevc.com
  // Example: john.rouge@gmail.com, admin@rougevc.com
  if (e.endsWith('.rouge@gmail.com') || e.endsWith('@rougevc.com')) return true;
  // If no allowlist configured, allow any authenticated email (production will set envs)
  if (allowedEmails.length === 0 && allowedDomains.length === 0 && allowedEmailPatterns.length === 0) {
    return true;
  }
  if (allowedEmails.includes(e)) return true;
  if (allowedDomains.some((d) => e.endsWith(`@${d}`))) return true;
  if (allowedEmailPatterns.some((p) => p.test(e))) return true;
  return false;
}

// Deprecated: EMAIL_AUTH_USERS environment variable is no longer used
// Authentication is now fully database-backed via lib/auth/auth-service.ts
const isProd = process.env.NODE_ENV === "production";
const devBypass = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";
const googleConfigured = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;
const allowEmailAuthToggle =
  devBypass || process.env.NEXT_PUBLIC_ENABLE_EMAIL_AUTH === "true" || (!googleConfigured && !isProd);
const enableCredentialsProvider = allowEmailAuthToggle;

const providers: NextAuthOptions["providers"] = [];

if (googleConfigured) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          name: profile.name,
          image: profile.picture,
          googleId: profile.sub,
        };
      },
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
      async authorize(credentials, req) {
        const email = credentials?.email?.toLowerCase().trim();
        const password = credentials?.password || "";

        if (!email || !password) {
          await logLoginAttempt({
            email: email || 'unknown',
            success: false,
            errorMessage: 'Missing credentials',
          });
          throw new Error("CredentialsSignin");
        }

        // Check if Rouge email
        if (!devBypass && !isRougeEmail(email)) {
          await logLoginAttempt({
            email,
            success: false,
            errorMessage: getEmailRejectionReason(email),
          });
          throw new Error("AccessDenied");
        }

        // Dev bypass
        if (devBypass) {
          return {
            id: email,
            email,
            name: email.split("@")[0] || "Dev User",
          };
        }

        // Check if account is locked
        const locked = await isUserLocked(email);
        if (locked) {
          await logLoginAttempt({
            email,
            success: false,
            errorMessage: 'Account locked due to too many failed attempts',
          });
          throw new Error("AccountLocked");
        }

        // Find user in database
        const user = await findUserByEmail(email);
        if (!user || !user.passwordHash) {
          await incrementFailedLoginAttempts(email);
          await logLoginAttempt({
            email,
            success: false,
            errorMessage: 'Invalid credentials',
          });
          throw new Error("CredentialsSignin");
        }

        // Verify password
        const passwordMatches = await verifyPassword(password, user.passwordHash);
        if (!passwordMatches) {
          await incrementFailedLoginAttempts(email);
          await logLoginAttempt({
            email,
            success: false,
            userId: user.id,
            errorMessage: 'Invalid password',
          });
          throw new Error("CredentialsSignin");
        }

        // Check if user is active
        if (!user.isActive || user.status !== 'active') {
          await logLoginAttempt({
            email,
            success: false,
            userId: user.id,
            errorMessage: 'Account is not active',
          });
          throw new Error("AccountInactive");
        }

        // Update last login
        await updateLastLogin(user.id);

        // Log successful login
        await logLoginAttempt({
          email,
          success: true,
          userId: user.id,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.displayName || `${user.firstName} ${user.lastName}`,
          image: user.avatar,
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
    async signIn({ user, account }) {
      // Dev bypass sign-in checks
      if (devBypass) return true;
      
      const email = user.email?.toLowerCase().trim();
      if (!email) return "/unauthorized";
      
      // Check if Rouge email
      if (!isRougeEmail(email)) {
        await logLoginAttempt({
          email,
          success: false,
          errorMessage: getEmailRejectionReason(email),
        });
        return "/unauthorized";
      }
      
      // For Google OAuth, create or update user in database
      if (account?.provider === "google") {
        try {
          let dbUser = await findUserByGoogleId(user.id);
          
          if (!dbUser) {
            // Check if user exists by email
            dbUser = await findUserByEmail(email);
            
            if (!dbUser) {
              // Create new user
              const nameParts = user.name?.split(" ") || [];
              await createUser({
                email,
                password: randomUUID(), // Random password for OAuth users
                firstName: nameParts[0] || "User",
                lastName: nameParts.slice(1).join(" ") || "",
                oauthProvider: "google",
                googleId: user.id,
              });
            } else {
              // Update existing user with Google ID
              const { updateUser } = await import("./auth/auth-service");
              await updateUser(dbUser.id, {
                googleId: user.id,
                oauthProvider: "google",
              });
            }
          }
          
          // Update last login
          if (dbUser) {
            await updateLastLogin(dbUser.id);
          }
          
          // Log successful login
          await logLoginAttempt({
            email,
            success: true,
            userId: dbUser?.id,
          });
        } catch (error) {
          console.error("[Auth] Error handling Google sign-in:", error);
          return "/unauthorized";
        }
      }
      
      return true;
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
