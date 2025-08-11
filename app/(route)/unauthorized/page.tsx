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
        className="max-w-md text-center bg-[#1b1d1e] border border-gray-700 rounded-2xl p-6 shadow-lg"
      >
        <div className="flex justify-center mb-3">
          <ShieldAlert className="h-10 w-10 text-red-400" />
        </div>
        <h1 className="text-3xl font-bold mb-3">Access Restricted</h1>
        <p className="text-base mb-5 text-gray-300">
          Access is restricted. Please sign in with an allowed company email as configured by the administrator.
        </p>
        <p className="text-sm text-gray-400 mb-4">Please sign in with a valid company email or contact the admin for access.</p>
        <Link href="/signin" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">Go to sign in</Link>
      </motion.div>
    </main>
  );
}
