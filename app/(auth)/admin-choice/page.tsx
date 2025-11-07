"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { LayoutDashboard, Shield, ArrowRight } from "lucide-react";

export default function AdminChoicePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect non-admins to home
  useEffect(() => {
    if (status === "authenticated") {
      const userRole = (session?.user as any)?.role;
      
      if (userRole !== "admin") {
        router.push("/home");
      }
    } else if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const userName = session?.user?.name || "Admin";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-500 rounded-full blur-3xl opacity-10" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-purple-500 rounded-full blur-3xl opacity-10" />
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl w-full"
        >
          {/* Logo and Title */}
          <div className="text-center mb-12">
            <Link href="/" className="inline-flex items-center gap-3 mb-6">
              <Image src="/logo.jpg" alt="Rouge Logo" width={48} height={48} className="rounded-lg" />
              <span className="text-2xl font-bold text-white">Rouge Dashboard</span>
            </Link>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {userName}!</h1>
            <p className="text-gray-400">Choose where you&apos;d like to go</p>
          </div>

          {/* Choice Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dashboard Option */}
            <Link 
              href="/home"
              onClick={() => {
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("from_admin_choice", "true");
                }
              }}
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all cursor-pointer group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <LayoutDashboard className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    Dashboard
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Access all tools, work tracker, analytics, and your daily workflow
                  </p>
                  <div className="flex items-center text-blue-600 dark:text-blue-400 font-semibold group-hover:gap-3 gap-2 transition-all">
                    Enter Dashboard
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>
            </Link>

            {/* Admin Control Panel Option */}
            <Link 
              href="/admin/dashboard"
              onClick={() => {
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("from_admin_choice", "true");
                }
              }}
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 border-2 border-gray-200 dark:border-gray-700 hover:border-red-500 dark:hover:border-red-500 transition-all cursor-pointer group"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Shield className="w-10 h-10 text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                    Admin Control Panel
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Manage users, approve registrations, assign roles, and configure system settings
                  </p>
                  <div className="flex items-center text-red-600 dark:text-red-400 font-semibold group-hover:gap-3 gap-2 transition-all">
                    Enter Admin Panel
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>
            </Link>
          </div>

          {/* Info Box */}
          <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 You can switch between Dashboard and Admin Panel anytime using the TopBar navigation
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
