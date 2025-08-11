import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function requireSession(): Promise<Session> {
  // Dev bypass: allow all in local development without sign-in
  if (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_DISABLE_AUTH === "true"
  ) {
    return { user: { email: "dev@local" } } as unknown as Session;
  }
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
