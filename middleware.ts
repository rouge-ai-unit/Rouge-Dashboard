import { withAuth } from "next-auth/middleware";
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger } from './lib/client-utils';

const devBypass = process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";

const envDomains = (process.env.ALLOWED_DOMAINS || "").split(",").map((s) => s.trim()).filter(Boolean);
const envEmails = (process.env.ALLOWED_EMAILS || "").split(",").map((s) => s.trim()).filter(Boolean);
const envPatterns = (process.env.ALLOWED_EMAIL_PATTERNS || "").split(",").map((s) => s.trim()).filter(Boolean);
const patternRegex = envPatterns
  .map((p) => {
    try {
      return new RegExp(p);
    } catch {
      return /^$/;
    }
  })
  .filter(Boolean);

// Production middleware wrapper
function withProductionMiddleware(handler: any) {
  return async (request: NextRequest) => {
    const startTime = Date.now();
    const url = request.url;
    const method = request.method;
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Log incoming requests in production
    if (process.env.NODE_ENV === 'production') {
      const clientIP = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      request.headers.get('cf-connecting-ip') ||
                      'unknown';

      logger.info('Incoming request', {
        method,
        url,
        userAgent: userAgent.substring(0, 200),
        ip: clientIP
      });
    }

    // Environment validation removed (production.ts deleted)

    // Call the auth middleware
    const response = await handler(request);

    // Apply security headers if response exists
    if (response) {
      // Security headers removed (production.ts deleted)

      // Add request timing header
      const processingTime = Date.now() - startTime;
      response.headers.set('X-Response-Time', `${processingTime}ms`);

      // Log response in production
      if (process.env.NODE_ENV === 'production') {
        logger.info('Request completed', {
          method,
          url,
          status: response.status,
          processingTime
        });
      }
    }

    return response;
  };
}

const authMiddleware = withAuth({
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    authorized: ({ token }) => {
      if (devBypass) return true; // allow all locally
      const email = token?.email?.toLowerCase().trim() ?? "";
      if (!email) return false;
      // Special-case allow: emails whose local-part ends with '.rouge' at gmail
      if (email.endsWith('.rouge@gmail.com')) return true;
      // If no allowlist configured, allow any authenticated email
      if (envEmails.length === 0 && envDomains.length === 0 && patternRegex.length === 0) return true;
      if (envEmails.includes(email)) return true;
      if (envDomains.some((d) => email.endsWith(`@${d}`))) return true;
      if (patternRegex.some((re) => re.test(email))) return true;
      return false;
    },
  },
});

export default withProductionMiddleware(authMiddleware);

export const config = {
  matcher: [
    "/stats",
    "/help",
    "/work-tracker",
    "/settings",
    "/tools/:path*",
  ],
};
