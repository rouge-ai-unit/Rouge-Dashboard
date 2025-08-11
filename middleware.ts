import { withAuth } from "next-auth/middleware";

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

export default withAuth({
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    authorized: ({ token }) => {
      if (devBypass) return true; // allow all locally
      const email = token?.email?.toLowerCase().trim() ?? "";
      if (!email) return false;
      // If no allowlist configured, allow any authenticated email
      if (envEmails.length === 0 && envDomains.length === 0 && patternRegex.length === 0) return true;
      if (envEmails.includes(email)) return true;
      if (envDomains.some((d) => email.endsWith(`@${d}`))) return true;
      if (patternRegex.some((re) => re.test(email))) return true;
      return false;
    },
  },
});

export const config = {
  matcher: [
    "/dashboard",
  "/stats",
  "/help",
  "/work-tracker",
  "/settings",
  "/tools/:path*",
  ],
};
