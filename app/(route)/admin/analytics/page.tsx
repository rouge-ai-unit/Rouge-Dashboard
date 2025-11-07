"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ArrowLeft, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserGrowthChart, LoginActivityChart, LoginByHourChart } from "@/components/admin/AnalyticsCharts";
import Link from "next/link";

export default function AnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Protect admin route
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/dashboard">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin Dashboard
          </Button>
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Comprehensive analytics and insights for your platform
        </p>
      </div>

      {/* Charts Grid */}
      <div className="space-y-6">
        {/* User Growth */}
        <UserGrowthChart />

        {/* Login Activity */}
        <LoginActivityChart />

        {/* Login by Hour */}
        <LoginByHourChart />
      </div>
    </div>
  );
}
