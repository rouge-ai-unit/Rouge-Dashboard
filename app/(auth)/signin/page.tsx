"use client";

import { Suspense, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { LoginError } from "@/components/LoginError";
import { useSearchParams } from "next/navigation";

const errorMessages: Record<string, string> = {
  AccessDenied: "Access restricted to Rouge team members only. Please use your Rouge email address (ending with .rouge@gmail.com or @rougevc.com)",
  OAuthSignin: "Could not start OAuth sign-in.",
  OAuthCallback: "OAuth callback failed.",
  OAuthAccountNotLinked: "Account not linked to the chosen provider.",
  CredentialsSignin: "Invalid email or password.",
  EmailSignInDisabled: "Email sign-in is disabled. Contact an admin to enable it.",
  Configuration: "Authentication provider is not configured. Check server environment variables.",
  AccountLocked: "Your account has been locked due to too many failed login attempts. Please try again in 15 minutes or reset your password.",
  AccountInactive: "Your account is inactive. Please contact support.",
  AccountPendingApproval: "Your account is pending approval from the AI Unit team. You will receive an email once approved.",
};

function resolveErrorMessage(error?: string | null): string {
  if (!error) return "";
  return errorMessages[error] || error;
}

function SearchParamsEffect({
  onError,
}: {
  onError: (message: string) => void;
}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const err = searchParams?.get("error");
    if (err) {
      onError(resolveErrorMessage(err));
    }
  }, [searchParams, onError]);
  return null;
}


export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [devBypass, setDevBypass] = useState(false);
  const [enableEmailAuth, setEnableEmailAuth] = useState(false);

  useEffect(() => {
    setHydrated(true);
    // Only run on client
    setDevBypass(
      typeof window !== "undefined" && (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DISABLE_AUTH === "true")
    );
    setEnableEmailAuth(process.env.NEXT_PUBLIC_ENABLE_EMAIL_AUTH === "true");
  }, []);

  const handleGoogle = async () => {
    setLoading("google");
    setError(null);
    try {
      const res = await signIn("google", { callbackUrl: "/home", redirect: false });
      if (res?.error) {
        setError(resolveErrorMessage(res.error));
        setDialogOpen(true);
      } else if (res?.url) {
        window.location.href = res.url;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setDialogOpen(true);
    } finally {
      setLoading(null);
    }
  };

  const handleEmail = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) return;
    setLoading("email");
    setError(null);
    try {
      const res = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/home" });
      if (res?.error) {
        setError(resolveErrorMessage(res.error));
        setDialogOpen(true);
      } else if (res?.ok && res?.url) {
        window.location.href = "/home";
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setDialogOpen(true);
    } finally {
      setLoading(null);
    }
  };

  if (!hydrated) {
    // Prevent hydration mismatch by not rendering until after mount
    return <div className="min-h-screen bg-[#18191A]" />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Background gradient/blur */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-10 bg-blue-500" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-10 bg-purple-500" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-[5vw] py-[5vh] md:grid md:grid-cols-2 md:px-0 md:py-0">
        {/* Welcome/brand side */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col justify-center p-4 md:p-12"
        >
          <div className="mb-6 flex items-center gap-3">
            <Image src="/logo.jpg" alt="Logo" width={40} height={40} className="h-10 w-10 rounded-md object-cover" />
            <span className="text-xl font-bold text-white">Rouge Dashboard</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white">Welcome back</h1>
          <p className="mt-3 text-base text-gray-300">
            Access your AI-powered operations platform for AgTech research, startup discovery, and content automation.
          </p>
          <div className="mt-8 hidden md:block">
            <ul className="space-y-3 text-gray-300">
              <li>• AgTech event discovery & startup analysis</li>
              <li>• AI-powered content generation & outreach</li>
              <li>• University research database & TTO insights</li>
              <li>• Project tracking & ticketing system</li>
              <li>• Enterprise security with audit logging</li>
            </ul>
          </div>
        </motion.div>

        {/* Auth card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex w-full items-center justify-center p-4 md:p-12"
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-white dark:bg-gray-800 p-4 md:p-6 shadow-2xl">
            <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">Sign in</h2>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">Choose a method to continue</p>

            <button
              onClick={handleGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-4 font-semibold text-black transition hover:bg-gray-100 min-h-[48px] text-base"
              style={{ touchAction: 'manipulation' }}
            >
              {loading === "google" ? (
                <span className="animate-pulse">Redirecting…</span>
              ) : (
                <>
                  <Image src="/globe.svg" width={20} height={20} className="h-5 w-5" alt="" />
                  Continue with Google
                </>
              )}
            </button>

            {devBypass || enableEmailAuth ? (
              <>
                <div className="my-6 flex items-center gap-3 text-xs text-gray-500">
                  <div className="h-px flex-1 bg-gray-700" />
                  <span>or</span>
                  <div className="h-px flex-1 bg-gray-700" />
                </div>
                <form onSubmit={handleEmail} className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-3 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[48px] text-base transition-colors"
                    style={{ touchAction: 'manipulation' }}
                  />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Password</label>
                      <Link href="/forgot-password" className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                        Forgot password?
                      </Link>
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      autoComplete="current-password"
                      className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-3 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[48px] text-base transition-colors"
                      style={{ touchAction: 'manipulation' }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-blue-600 px-4 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-60 min-h-[48px] text-base"
                    disabled={!email || !password || loading === "email"}
                    style={{ touchAction: 'manipulation' }}
                  >
                    {loading === "email" ? "Signing in…" : "Continue with Email"}
                  </button>
                </form>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogContent className="max-w-xs w-full sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Sign-in Error</DialogTitle>
                    </DialogHeader>
                    <div className="text-red-500 text-sm">{error}</div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <p className="mt-6 text-center text-xs text-gray-500">
                Use your company Google account to sign in.
              </p>
            )}

            {/* Sign Up Link */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold">
                  Sign up
                </Link>
              </p>
            </div>

            <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">By continuing, you agree to our Terms and Privacy Policy.</p>
            {/* Global top toast for error (optional) */}
            {error && (
              <LoginError
                message={error}
                onClose={() => {
                  setError(null);
                  setDialogOpen(false);
                }}
              />
            )}
          </div>
        </motion.div>
      </div>
      <Suspense>
        <SearchParamsEffect
          onError={(msg) => {
            setError(msg);
            setDialogOpen(true);
          }}
        />
      </Suspense>
    </div>
  );
}
