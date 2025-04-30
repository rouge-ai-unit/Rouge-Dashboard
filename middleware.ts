import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => {
      const allowedDomains = ["rougevc.com", "rlsclub.com"];
      const allowedEmailPatterns = [/\.rouge@gmail\.com$/]; // Regex pattern for .rouge@gmail.com

      const email = token?.email?.toLowerCase().trim() ?? "";

      const isAllowedDomain = allowedDomains.some((domain) =>
        email.endsWith(`@${domain}`)
      );

      const matchesPattern = allowedEmailPatterns.some((pattern) =>
        pattern.test(email)
      );

      return isAllowedDomain || matchesPattern;
    },
  },
});

export const config = {
  matcher: [
    "/dashboard",
    "/states",
    "/ai-news-daily",
    "/contact",
    "/tools/:path*",
  ],
};
