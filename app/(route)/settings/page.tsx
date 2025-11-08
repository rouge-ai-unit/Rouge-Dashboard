"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Loader2,
  Save,
  RefreshCw,
  AlertCircle,
  Check,
  Settings as SettingsIcon
} from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { toast } from "sonner";

// Import settings sections
import ProfileSettings from "../../../components/settings/ProfileSettings";
import NotificationSettings from "../../../components/settings/NotificationSettings";
import SecuritySettings from "../../../components/settings/SecuritySettings";
import IntegrationSettings from "../../../components/settings/IntegrationSettings";
import SystemSettings from "../../../components/settings/SystemSettings";
import ColdOutreachSettings from "../../../components/settings/ColdOutreachSettings";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const { settings, loading, saving, error, refetch, isStale } = useSettings();
  const [activeTab, setActiveTab] = useState("profile");

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto" />
          <p className="text-gray-400">Loading settings...</p>
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
            You must be logged in to access settings.
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-gray-400 mt-1">
            Manage your account preferences and application settings
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
      <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            Account Overview
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
              <p className="text-sm text-gray-400 mb-1">Role & Unit</p>
              <div className="flex items-center gap-2 flex-wrap mt-1">
                <Badge variant="outline" className="border-blue-500/30 text-blue-400 capitalize">
                  {(session?.user as any)?.role || 'Member'}
                </Badge>
                {(session?.user as any)?.unit && (
                  <Badge variant="outline" className="border-purple-500/30 text-purple-400">
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
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 bg-gray-800/50 border border-gray-700/50">
          <TabsTrigger value="profile" className="data-[state=active]:bg-blue-600">
            <User className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="data-[state=active]:bg-blue-600">
            <Bell className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="data-[state=active]:bg-blue-600">
            <Shield className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="data-[state=active]:bg-blue-600">
            <Globe className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="cold-outreach" className="data-[state=active]:bg-blue-600">
            <SettingsIcon className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Cold Outreach</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="data-[state=active]:bg-blue-600">
            <Palette className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <SecuritySettings />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <IntegrationSettings />
        </TabsContent>

        <TabsContent value="cold-outreach" className="space-y-4">
          <ColdOutreachSettings />
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <SystemSettings />
        </TabsContent>
      </Tabs>

      {/* Save Indicator */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Saving changes...
        </div>
      )}
    </div>
  );
}
