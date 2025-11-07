"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Clock, Mail, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function PendingApprovalPage() {
  const [adminEmail, setAdminEmail] = useState("");

  // Fetch admin email dynamically
  useEffect(() => {
    const fetchAdminEmail = async () => {
      try {
        const response = await fetch('/api/public/admin-emails');
        if (response.ok) {
          const data = await response.json();
          setAdminEmail(data.primaryEmail || '');
        }
      } catch (error) {
        console.error('Error fetching admin email:', error);
      }
    };
    fetchAdminEmail();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-yellow-500 rounded-full blur-3xl opacity-10" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-orange-500 rounded-full blur-3xl opacity-10" />
      </div>

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl w-full"
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-3 mb-6">
              <Image src="/logo.jpg" alt="Rouge Logo" width={48} height={48} className="rounded-lg" />
              <span className="text-2xl font-bold text-white">Rouge Dashboard</span>
            </Link>
          </div>

          {/* Main Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 md:p-12">
            {/* Icon */}
            <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <Clock className="w-10 h-10 text-yellow-600 dark:text-yellow-400" />
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-4">
              Registration Pending Approval
            </h1>

            {/* Description */}
            <p className="text-center text-gray-600 dark:text-gray-300 mb-8">
              Thank you for registering! Your account is currently being reviewed by our AI Unit team.
            </p>

            {/* Info Box */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-8">
              <h2 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                What happens next?
              </h2>
              <ul className="space-y-3 text-sm text-yellow-800 dark:text-yellow-200">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Our AI Unit team will review your registration details</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>You will receive an email notification once your account is approved</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Approval typically takes 24-48 hours during business days</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>Once approved, you can sign in and access the dashboard</span>
                </li>
              </ul>
            </div>

            {/* Timeline */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-8">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                Estimated Timeline
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Registration Submitted</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Your account has been created</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Under Review</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">AI Unit team is reviewing your request</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Approval & Access</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">You&apos;ll receive an email when approved</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Have an urgent request or questions?
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Contact us at{" "}
                <a href={`mailto:${adminEmail}`} className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold">
                  {adminEmail}
                </a>
              </p>
            </div>

            {/* Back to Sign In */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
              <Link
                href="/signin"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold text-sm"
              >
                ← Back to Sign In
              </Link>
            </div>
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} Rouge. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
