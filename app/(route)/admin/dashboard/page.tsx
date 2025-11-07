"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield, Users, Clock, Activity, Settings, ArrowRight, CheckCircle, XCircle, TrendingUp, UserCheck, RefreshCw } from "lucide-react";
import { DashboardSkeleton } from "@/components/admin/DashboardSkeleton";
import { toast } from "sonner";

interface DashboardAnalytics {
  overview: {
    totalUsers: number;
    activeUsers: number;
    pendingApprovals: number;
    pendingToolRequests: number;
    pendingToolAccessRequests: number;
    activeSessions: number;
  };
  growth: {
    newUsersThisWeek: number;
    newUsersThisMonth: number;
  };
  distribution: {
    byRole: Array<{ role: string; count: number }>;
    byUnit: Array<{ unit: string; count: number }>;
    byStatus: Array<{ status: string; count: number }>;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    targetResource: string;
    adminName: string;
    createdAt: string;
  }>;
  timestamp: string;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Protect admin route
  useEffect(() => {
    if (status === "authenticated") {
      const userRole = (session?.user as any)?.role;
      
      if (userRole !== "admin") {
        router.push("/home");
      } else {
        // Set flag that user came from admin choice
        if (typeof window !== "undefined") {
          sessionStorage.setItem("from_admin_choice", "true");
        }
        
        // Fetch analytics
        fetchAnalytics();
        
        // Set up auto-refresh every 30 seconds
        const interval = setInterval(() => {
          fetchAnalytics(true);
        }, 30000);
        
        return () => clearInterval(interval);
      }
    } else if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, session, router]);

  const fetchAnalytics = async (silent = false) => {
    try {
      if (!silent) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      
      const response = await fetch("/api/admin/analytics/dashboard");
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      } else {
        if (!silent) {
          toast.error("Failed to fetch dashboard analytics");
        }
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      if (!silent) {
        toast.error("Error loading dashboard");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (status === "loading" || loading) {
    return <DashboardSkeleton />;
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Failed to load dashboard</p>
          <button
            onClick={() => fetchAnalytics()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-red-600" />
              <h1 className="text-3xl font-bold">Admin Control Panel</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Manage users, roles, permissions, and system settings
            </p>
          </div>
          <button
            onClick={() => fetchAnalytics()}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm">Refresh</span>
          </button>
        </div>
        {analytics.timestamp && (
          <p className="text-xs text-gray-500 mt-2">
            Last updated: {new Date(analytics.timestamp).toLocaleString()}
          </p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6 mb-8">
        <Link href="/admin/approvals">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-yellow-500 dark:hover:border-yellow-500 transition-colors cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 text-yellow-600" />
              <span className="text-3xl font-bold">{analytics.overview.pendingApprovals}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Pending Approvals</h3>
            <div className="flex items-center text-yellow-600 text-sm font-medium group-hover:gap-2 gap-1 transition-all">
              Review Now <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        <Link href="/admin/users">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-blue-600" />
              <span className="text-3xl font-bold">{analytics.overview.totalUsers}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Total Users</h3>
            <div className="flex items-center text-blue-600 text-sm font-medium group-hover:gap-2 gap-1 transition-all">
              Manage Users <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <UserCheck className="w-8 h-8 text-green-600" />
            <span className="text-3xl font-bold">{analytics.overview.activeUsers}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Active Users</h3>
          <div className="text-xs text-gray-500">
            {analytics.overview.activeSessions} active sessions
          </div>
        </div>

        <Link href="/admin/tool-requests">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <Shield className="w-8 h-8 text-indigo-600" />
              <span className="text-3xl font-bold">{analytics.overview.pendingToolAccessRequests || 0}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Tool Access</h3>
            <div className="flex items-center text-indigo-600 text-sm font-medium group-hover:gap-2 gap-1 transition-all">
              Review Access <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        <Link href="/admin/ai-tools-requests">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 transition-colors cursor-pointer group">
            <div className="flex items-center justify-between mb-4">
              <Activity className="w-8 h-8 text-purple-600" />
              <span className="text-3xl font-bold">{analytics.overview.pendingToolRequests}</span>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">AI Tool Requests</h3>
            <div className="flex items-center text-purple-600 text-sm font-medium group-hover:gap-2 gap-1 transition-all">
              View Requests <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-emerald-600" />
            <span className="text-3xl font-bold">{analytics.growth.newUsersThisWeek}</span>
          </div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">New This Week</h3>
          <div className="text-xs text-gray-500">
            {analytics.growth.newUsersThisMonth} this month
          </div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Users by Role */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Users by Role</h2>
          <div className="space-y-3">
            {analytics.distribution.byRole.map((item) => (
              <div key={item.role} className="flex items-center justify-between">
                <span className="text-sm capitalize text-gray-600 dark:text-gray-400">{item.role}</span>
                <span className="text-sm font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Users by Unit */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Users by Unit</h2>
          <div className="space-y-3">
            {analytics.distribution.byUnit.slice(0, 5).map((item) => (
              <div key={item.unit} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{item.unit}</span>
                <span className="text-sm font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Users by Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4">Users by Status</h2>
          <div className="space-y-3">
            {analytics.distribution.byStatus.map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <span className="text-sm capitalize text-gray-600 dark:text-gray-400">{item.status}</span>
                <span className="text-sm font-semibold">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Recent Admin Activity
          </h2>
          <div className="space-y-3">
            {analytics.recentActivity.length > 0 ? (
              analytics.recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 text-sm">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-gray-900 dark:text-white">
                      {activity.action.replace(/_/g, ' ')}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400 text-xs">
                      by {activity.adminName} • {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No recent activity</p>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Quick Links
          </h2>
          <div className="space-y-2">
            <Link href="/admin/users" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">User Management</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
            <Link href="/admin/approvals" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Approval Queue</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
            <Link href="/admin/permissions" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Role Permissions</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
            <Link href="/admin/activity-logs" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Activity Logs</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
            <Link href="/admin/units" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Units & Departments</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
            <Link href="/admin/support" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Support & Contact Requests</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
            <Link href="/admin/tool-requests" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tool Access Requests</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
            <Link href="/admin/ai-tools-requests" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">AI Tools Development Requests</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
            <Link href="/admin/analytics" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Analytics Dashboard</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
            <Link href="/admin/notifications" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Notification Center</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
            <Link href="/admin/email-templates" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Email Templates</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
            <Link href="/admin/security" className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Security Dashboard</span>
                <ArrowRight className="w-4 h-4 text-gray-400" />
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Back to Dashboard */}
      <div className="text-center">
        <Link href="/home">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors inline-flex items-center gap-2">
            <ArrowRight className="w-5 h-5 rotate-180" />
            Back to Dashboard
          </button>
        </Link>
      </div>
    </div>
  );
}
