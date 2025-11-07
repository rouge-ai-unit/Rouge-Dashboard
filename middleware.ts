import { withAuth } from "next-auth/middleware";
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { logger } from './lib/client-utils';
import { checkRoleBasedRateLimit, getRateLimitHeaders } from './lib/security/role-based-rate-limiter';

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

    // Apply rate limiting for API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
      const rateLimitResult = await checkRoleBasedRateLimit(request);
      
      if (!rateLimitResult.allowed) {
        const headers = getRateLimitHeaders(rateLimitResult);
        return new NextResponse(
          JSON.stringify({
            error: 'Too many requests',
            message: `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
            retryAfter: rateLimitResult.retryAfter,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              ...headers,
            },
          }
        );
      }
    }

    // Call the auth middleware
    let response = await handler(request);

    // Handle role-based redirects for authenticated users
    if (response && response.status === 200) {
      const pathname = request.nextUrl.pathname;
      
      // Only redirect on home page access
      if (pathname === '/home') {
        try {
          // Get session from request (this is a simplified check)
          // In production, you'd want to decode the JWT token properly
          const sessionCookie = request.cookies.get('next-auth.session-token') || request.cookies.get('__Secure-next-auth.session-token');
          
          if (sessionCookie) {
            // For now, we'll let the home page handle the redirect based on role
            // This is because middleware doesn't have easy access to decoded session data
            // The home page will check the session and redirect accordingly
          }
        } catch (error) {
          logger.info('Error checking role for redirect', { error });
        }
      }
    }

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
    error: "/unauthorized",
  },
  callbacks: {
    authorized: ({ token, req }) => {
      if (devBypass) return true; // allow all locally
      
      const email = token?.email?.toLowerCase().trim() ?? "";
      if (!email) return false;
      
      const pathname = req.nextUrl.pathname;
      
      // Always allow access to unauthorized page
      if (pathname === "/unauthorized") {
        return true;
      }
      
      // Check if user is approved
      const isApproved = (token as any)?.isApproved;
      if (isApproved === false) {
        // Allow access to pending approval page
        if (pathname === "/pending-approval") {
          return true;
        }
        // Redirect unapproved users trying to access other pages
        return false;
      }
      
      // Get user role from token
      const userRole = (token as any)?.role;
      
      // Define restricted routes for members
      const restrictedForMembers = [
        "/tools/startup-seeker",
        "/tools/agritech-universities",
        "/tools/sentiment-analyzer",
        "/tools/cold-connect-automator",
        "/tools/ai-outreach-agent"
      ];
      
      // Check if member is trying to access restricted tool
      if (userRole === "member" && restrictedForMembers.some(route => pathname.startsWith(route))) {
        return false; // Deny access - will redirect to signin (we'll handle redirect in the tool pages)
      }
      
      // Check if non-admin is trying to access admin routes
      if (pathname.startsWith("/admin") && userRole !== "admin") {
        return false; // Deny access - will redirect to signin (we'll handle redirect in admin pages)
      }
      
      // Special-case allow: emails whose local-part ends with '.rouge' at gmail and @rougevc.com
      if (email.endsWith('.rouge@gmail.com') || email.endsWith('@rougevc.com')) return true;
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
    "/work-tracker",
    "/settings",
    "/agtech-events",
    "/tools/:path*",
    "/admin/:path*",
    "/home",
    "/unauthorized",
  ],
};
