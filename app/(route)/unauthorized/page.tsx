"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <main className="flex items-center justify-center min-h-screen text-white p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="max-w-md text-center bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 rounded-2xl p-6 shadow-2xl"
      >
        <div className="flex justify-center mb-3">
          <ShieldAlert className="h-10 w-10 text-red-400" />
        </div>
        <h1 className="text-3xl font-bold mb-3">Access Restricted</h1>
        <p className="text-base mb-5 text-gray-300">
          Access is restricted to Rouge team members only. Please sign in with your Rouge email address (ending with .rouge@gmail.com or @rougevc.com).
        </p>
        <p className="text-sm text-gray-400 mb-4">Contact the AI team at ai@rougevc.com for account setup and onboarding.</p>
        <Link href="/signin" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Go to sign in</Link>
      </motion.div>
    </main>
  );
}
