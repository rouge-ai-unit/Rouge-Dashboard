"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import Image from "next/image";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const devBypass = typeof window !== "undefined" && (process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DISABLE_AUTH === "true");

  const handleGoogle = async () => {
    setLoading("google");
    await signIn("google");
    setLoading(null);
  };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading("email");
    await signIn("credentials", { email, redirect: true });
    setLoading(null);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background gradient/blur */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl opacity-25 bg-blue-500" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full blur-3xl opacity-20 bg-purple-500" />
      </div>

      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 md:grid-cols-2">
        {/* Welcome/brand side */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col justify-center p-8 md:p-12"
        >
          <div className="mb-6 flex items-center gap-3">
            <Image src="/logo.jpg" alt="Logo" width={40} height={40} className="h-10 w-10 rounded-md object-cover" />
            <span className="text-xl font-bold text-white">Rouge Dashboard</span>
          </div>
          <h1 className="text-4xl font-extrabold text-white">Welcome back</h1>
          <p className="mt-3 text-base text-gray-300">
            Sign in to access your AI tools, analytics, and work tracker. Modern, fast, and delightful.
          </p>
          <div className="mt-8 hidden md:block">
            <ul className="space-y-3 text-gray-300">
              <li>• Real-time dashboards</li>
              <li>• Tool requests and progress tracking</li>
              <li>• Beautiful dark theme with smooth transitions</li>
            </ul>
          </div>
        </motion.div>

        {/* Auth card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-center bg-[#141516]/60 p-8 md:p-12"
        >
          <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-[#1b1d1e]/80 p-6 shadow-xl backdrop-blur">
            <h2 className="mb-2 text-2xl font-bold text-white">Sign in</h2>
            <p className="mb-6 text-sm text-gray-400">Choose a method to continue</p>

            <button
              onClick={handleGoogle}
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-3 font-semibold text-black transition hover:bg-gray-100"
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

            {devBypass ? (
              <>
                <div className="my-6 flex items-center gap-3 text-xs text-gray-500">
                  <div className="h-px flex-1 bg-gray-700" />
                  <span>or</span>
                  <div className="h-px flex-1 bg-gray-700" />
                </div>
                <form onSubmit={handleEmail} className="space-y-3">
                  <label className="block text-sm text-gray-300">Email (dev)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full rounded-lg border border-gray-700 bg-[#121314] px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-blue-600 px-4 py-2 font-bold text-white transition hover:bg-blue-700 disabled:opacity-60"
                    disabled={!email || loading === "email"}
                  >
                    {loading === "email" ? "Signing in…" : "Continue with Email"}
                  </button>
                </form>
              </>
            ) : (
              <p className="mt-6 text-center text-xs text-gray-500">
                Use your company Google account to sign in.
              </p>
            )}

            <p className="mt-6 text-center text-xs text-gray-500">
              By continuing, you agree to our Terms and Privacy Policy.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
