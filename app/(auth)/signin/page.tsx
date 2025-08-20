"use client";

import { Suspense, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import Image from "next/image";
import { LoginError } from "@/components/LoginError";
import { useSearchParams } from "next/navigation";

function SearchParamsEffect({
  onError,
}: {
  onError: (message: string) => void;
}) {
  const searchParams = useSearchParams();
  useEffect(() => {
    const err = searchParams?.get("error");
    if (err) {
      const map: Record<string, string> = {
        AccessDenied: "You are not authorized to access this app.",
        OAuthSignin: "Could not start OAuth sign-in.",
        OAuthCallback: "OAuth callback failed.",
        OAuthAccountNotLinked: "Account not linked to the chosen provider.",
      };
      onError(map[err] || err);
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
    await signIn("google", { callbackUrl: "/home" });
    setLoading(null);
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading("email");
    setError(null);
    try {
      const res = await signIn("credentials", { email, password, redirect: false, callbackUrl: "/home" });
      if (res?.error) {
        setError(res.error);
        setDialogOpen(true);
      } else if (res?.ok && res?.url) {
        window.location.href = "/home";
      }
    } catch (err: any) {
      setError(err?.message || "Unknown error");
      setDialogOpen(true);
    }
    setLoading(null);
  };

  if (!hydrated) {
    // Prevent hydration mismatch by not rendering until after mount
    return <div className="min-h-screen bg-[#18191A]" />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background gradient/blur */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl opacity-25 bg-blue-500" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full blur-3xl opacity-20 bg-purple-500" />
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
            Sign in to access your AI tools, analytics, and work tracker. Modern, fast, and delightful.
          </p>
          <div className="mt-8 hidden md:block">
            <ul className="space-y-3 text-gray-300">
              <li>• Real-time dashboards</li>
              <li>• Tool requests and progress tracking</li>
              <li>• Content Idea Automation & AI News Daily</li>
              <li>• University & Startup Data Extractors</li>
              <li>• Integrated support and contact system</li>
              <li>• Beautiful dark theme with smooth transitions</li>
               
            </ul>
          </div>
        </motion.div>

        {/* Auth card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex w-full items-center justify-center bg-[#141516]/60 p-4 md:p-12"
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-[#1b1d1e]/80 p-4 md:p-6 shadow-xl backdrop-blur">
            <h2 className="mb-2 text-2xl font-bold text-white">Sign in</h2>
            <p className="mb-6 text-sm text-gray-400">Choose a method to continue</p>

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
                  <label className="block text-sm text-gray-300">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    className="w-full rounded-lg border border-gray-700 bg-[#121314] px-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[48px] text-base"
                    style={{ touchAction: 'manipulation' }}
                  />
                  <label className="block text-sm text-gray-300">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-gray-700 bg-[#121314] px-3 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 min-h-[48px] text-base"
                    style={{ touchAction: 'manipulation' }}
                  />
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

            <p className="mt-6 text-center text-xs text-gray-500">By continuing, you agree to our Terms and Privacy Policy.</p>
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
