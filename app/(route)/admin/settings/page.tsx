"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  User, 
  Bell, 
  Shield, 
  Settings as SettingsIcon,
  Loader2,
  RefreshCw,
  AlertCircle,
  Check,
  ArrowLeft
} from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import Link from "next/link";

// Import admin settings sections
import AdminProfileSettings from "../../../../components/settings/admin/AdminProfileSettings";
import AdminNotificationSettings from "../../../../components/settings/admin/AdminNotificationSettings";
import SecuritySettings from "../../../../components/settings/SecuritySettings";
import AdminSystemSettings from "../../../../components/settings/admin/AdminSystemSettings";

export default function AdminSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { settings, loading, saving, error, refetch, isStale } = useSettings();
  const [activeTab, setActiveTab] = useState("profile");

  // Protect admin route
  React.useEffect(() => {
    if (status === "authenticated") {
      const userRole = (session?.user as any)?.role;
      if (userRole !== "admin") {
        router.push("/home");
      }
    } else if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, session, router]);

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-red-500 mx-auto" />
          <p className="text-gray-400">Loading admin settings...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Alert className="max-w-md bg-red-900/20 border-red-500/30">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">
            You must be logged in as an admin to access these settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Alert className="max-w-md bg-red-900/20 border-red-500/30">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">
            Failed to load settings. Please try again.
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full"
              onClick={() => refetch()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/admin/dashboard">
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Admin Dashboard
        </Button>
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            Admin Settings
          </h1>
          <p className="text-gray-400 mt-1">
            Manage your admin account preferences and system settings
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isStale && (
            <Badge variant="outline" className="border-yellow-500/30 text-yellow-400">
              <AlertCircle className="w-3 h-3 mr-1" />
              Outdated
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
            className="border-gray-700 hover:bg-gray-800"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Account Overview Card */}
      <Card className="bg-gradient-to-br from-red-900/20 to-orange-900/20 border-red-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" />
            Admin Account Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-400 mb-1">Name</p>
              <p className="text-lg font-semibold text-white">
                {settings?.profile?.firstName && settings?.profile?.lastName 
                  ? `${settings.profile.firstName} ${settings.profile.lastName}`
                  : session?.user?.name || 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Email</p>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-lg font-semibold text-white">
                  {session?.user?.email}
                </p>
                <Badge variant="outline" className="border-green-500/30 text-green-400">
                  <Check className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Role & Permissions</p>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <Badge variant="outline" className="border-red-500/30 text-red-400 capitalize">
                  <Shield className="w-3 h-3 mr-1" />
                  Administrator
                </Badge>
                {(session?.user as any)?.unit && (
                  <Badge variant="outline" className="border-orange-500/30 text-orange-400">
                    {(session?.user as any)?.unit}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 bg-gray-800/50 border border-gray-700/50">
          <TabsTrigger value="profile" className="data-[state=active]:bg-red-600">
            <User className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-red-600">
            <Bell className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-red-600">
            <Shield className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="data-[state=active]:bg-red-600">
            <SettingsIcon className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <AdminProfileSettings />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <AdminNotificationSettings />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <AdminSystemSettings />
        </TabsContent>
      </Tabs>

      {/* Save Indicator */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving changes...
        </div>
      )}
    </div>
  );
}
