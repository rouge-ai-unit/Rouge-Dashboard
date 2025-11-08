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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950">
      {/* Enhanced Background Effects */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-3xl opacity-20 bg-blue-600 animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-20 bg-purple-600 animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-10 bg-gradient-to-r from-blue-500 to-purple-500" />
      </div>
      
      {/* Grid Pattern Overlay */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-[5vw] py-[5vh] md:grid md:grid-cols-2 md:px-0 md:py-0">
        {/* Welcome/brand side */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col justify-center p-4 md:p-12"
        >
          <div className="mb-8 flex items-center gap-3">
            <div className="relative">
              <Image src="/logo.jpg" alt="Logo" width={48} height={48} className="h-12 w-12 rounded-xl object-cover shadow-lg ring-2 ring-blue-500/20" />
              <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 opacity-20 blur-lg" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Rouge Dashboard</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent leading-tight">
            Welcome back
          </h1>
          <p className="mt-4 text-lg text-gray-400 leading-relaxed">
            Your comprehensive AI-powered platform for AgTech innovation, research, and business automation.
          </p>
          <div className="mt-8 hidden md:block">
            <div className="space-y-2">
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 hover:border-blue-500/30 transition-colors group">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 group-hover:scale-125 transition-transform flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-gray-200 font-medium text-sm">AgTech Event Finder & Startup Seeker</span>
                  <p className="text-xs text-gray-500 mt-0.5">Discover events, analyze startups with AI scoring</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 hover:border-purple-500/30 transition-colors group">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 group-hover:scale-125 transition-transform flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-gray-200 font-medium text-sm">AI Content & Outreach Automation</span>
                  <p className="text-xs text-gray-500 mt-0.5">LinkedIn content, cold outreach, AI personalization</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 hover:border-cyan-500/30 transition-colors group">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-1.5 group-hover:scale-125 transition-transform flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-gray-200 font-medium text-sm">Research & Intelligence Tools</span>
                  <p className="text-xs text-gray-500 mt-0.5">Universities database, sentiment analyzer, AI news</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 hover:border-green-500/30 transition-colors group">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 group-hover:scale-125 transition-transform flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-gray-200 font-medium text-sm">Project Management Suite</span>
                  <p className="text-xs text-gray-500 mt-0.5">Work tracker, ticketing system, team collaboration</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-gray-800/30 backdrop-blur-sm border border-gray-700/50 hover:border-orange-500/30 transition-colors group">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 group-hover:scale-125 transition-transform flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-gray-200 font-medium text-sm">Enterprise Features</span>
                  <p className="text-xs text-gray-500 mt-0.5">Role-based access, admin controls, audit logging</p>
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20">
              <p className="text-xs text-gray-400 text-center">
                <span className="text-blue-400 font-semibold">11+ AI-powered tools</span> • Secure authentication • Real-time collaboration
              </p>
            </div>
          </div>
        </motion.div>

        {/* Auth card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex w-full items-center justify-center p-4 md:p-12"
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-700/50 bg-gray-800/50 backdrop-blur-xl p-6 md:p-8 shadow-2xl ring-1 ring-gray-700/50">
            <div className="mb-6">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Sign in</h2>
              <p className="mt-2 text-sm text-gray-400">Choose a method to continue</p>
            </div>

            <button
              onClick={handleGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-4 font-semibold text-black transition hover:bg-gray-50 hover:shadow-lg min-h-[52px] text-base border-2 border-transparent hover:border-blue-500/20"
              style={{ touchAction: 'manipulation' }}
            >
              {loading === "google" ? (
                <span className="animate-pulse">Redirecting…</span>
              ) : (
                <>
                  <Image src="/google-icon.svg" width={20} height={20} className="h-5 w-5" alt="Google" />
                  Continue with Google
                </>
              )}
            </button>

            {devBypass || enableEmailAuth ? (
              <>
                <div className="my-6 flex items-center gap-3 text-xs text-gray-500">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
                  <span className="text-gray-400">or</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-gray-600 to-transparent" />
                </div>
                <form onSubmit={handleEmail} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      autoComplete="email"
                      className="w-full rounded-xl border border-gray-600 bg-gray-700/50 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[52px] text-base transition-all backdrop-blur-sm"
                      style={{ touchAction: 'manipulation' }}
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-300">Password</label>
                      <Link href="/forgot-password" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                        Forgot password?
                      </Link>
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      autoComplete="current-password"
                      className="w-full rounded-xl border border-gray-600 bg-gray-700/50 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[52px] text-base transition-all backdrop-blur-sm"
                      style={{ touchAction: 'manipulation' }}
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 font-bold text-white transition hover:from-blue-700 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed min-h-[52px] text-base shadow-lg hover:shadow-xl"
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
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-400">
                Don&apos;t have an account?{" "}
                <Link href="/signup" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                  Sign up
                </Link>
              </p>
            </div>

            <p className="mt-6 text-center text-xs text-gray-500">
              By continuing, you agree to our{" "}
              <span className="text-gray-400 hover:text-gray-300 cursor-pointer">Terms</span>
              {" "}and{" "}
              <span className="text-gray-400 hover:text-gray-300 cursor-pointer">Privacy Policy</span>
            </p>
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
