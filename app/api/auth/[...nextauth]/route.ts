import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase().trim();
      const allowedEmails = ["desmond.marshall@gmail.com"];
      const allowedDomains = ["rougevc.com", "rlsclub.com"];
      const allowedEmailPatterns = [/\.rouge@gmail\.com$/]; // Regex pattern

      if (!email) return "/unauthorized";

      const isAllowedEmail = allowedEmails.includes(email);

      const isAllowedDomain = allowedDomains.some((domain) =>
        email.endsWith(`@${domain}`)
      );

      const matchesPattern = allowedEmailPatterns.some((pattern) =>
        pattern.test(email)
      );

      if (isAllowedEmail || isAllowedDomain || matchesPattern) {
        return true;
      }

      return "/unauthorized";
    },
  },
});

export { handler as GET, handler as POST };
