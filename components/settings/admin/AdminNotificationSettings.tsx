"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Mail, Shield, Users, Activity, Loader2, Save } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { toast } from "sonner";

export default function AdminNotificationSettings() {
  const { settings, updateSettings, saving } = useSettings();

  const [formData, setFormData] = useState({
    email: settings?.notifications?.email ?? true,
    push: settings?.notifications?.push ?? true,
    sound: settings?.notifications?.sound ?? false,
    pollInterval: settings?.notifications?.pollInterval ?? 30,
    // Admin-specific notifications
    userApprovals: true,
    toolRequests: true,
    securityAlerts: true,
    systemUpdates: true,
    userActivity: false,
  });

  const handleSave = async () => {
    const success = await updateSettings({
      notifications: {
        ...formData,
        ticketUpdates: true,
        workTracker: true,
        campaignUpdates: false,
        contactUpdates: false,
      },
    });

    if (success) {
      toast.success("Admin notification settings updated");
    }
  };

  React.useEffect(() => {
    if (settings?.notifications) {
      setFormData(prev => ({
        ...prev,
        email: settings.notifications?.email ?? true,
        push: settings.notifications?.push ?? true,
        sound: settings.notifications?.sound ?? false,
        pollInterval: settings.notifications?.pollInterval ?? 30,
      }));
    }
  }, [settings]);

  return (
    <Card className="bg-gray-800/50 border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-red-400" />
          Admin Notification Preferences
        </CardTitle>
        <CardDescription>
          Configure how you receive admin notifications and alerts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* General Notification Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-300">General Settings</h3>
          
          <div className="flex items-center justify-between py-3 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-400" />
              <div>
                <Label htmlFor="email-notifications" className="text-base">Email Notifications</Label>
                <p className="text-sm text-gray-400">Receive notifications via email</p>
              </div>
            </div>
            <Switch
              id="email-notifications"
              checked={formData.email}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, email: checked }))}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-purple-400" />
              <div>
                <Label htmlFor="push-notifications" className="text-base">Push Notifications</Label>
                <p className="text-sm text-gray-400">Receive in-app notifications</p>
              </div>
            </div>
            <Switch
              id="push-notifications"
              checked={formData.push}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, push: checked }))}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-green-400" />
              <div>
                <Label htmlFor="sound-notifications" className="text-base">Sound Alerts</Label>
                <p className="text-sm text-gray-400">Play sound for notifications</p>
              </div>
            </div>
            <Switch
              id="sound-notifications"
              checked={formData.sound}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sound: checked }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="poll-interval">Notification Check Interval</Label>
            <Select
              value={formData.pollInterval.toString()}
              onValueChange={(value) => setFormData(prev => ({ ...prev, pollInterval: parseInt(value) }))}
            >
              <SelectTrigger id="poll-interval" className="bg-gray-700/50 border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">Every 10 seconds</SelectItem>
                <SelectItem value="30">Every 30 seconds</SelectItem>
                <SelectItem value="60">Every minute</SelectItem>
                <SelectItem value="300">Every 5 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Admin-Specific Notifications */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-300">Admin Alerts</h3>

          <div className="flex items-center justify-between py-3 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-yellow-400" />
              <div>
                <Label htmlFor="user-approvals" className="text-base">User Approval Requests</Label>
                <p className="text-sm text-gray-400">New user registration approvals</p>
              </div>
            </div>
            <Switch
              id="user-approvals"
              checked={formData.userApprovals}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, userApprovals: checked }))}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-indigo-400" />
              <div>
                <Label htmlFor="tool-requests" className="text-base">Tool Access Requests</Label>
                <p className="text-sm text-gray-400">User requests for tool access</p>
              </div>
            </div>
            <Switch
              id="tool-requests"
              checked={formData.toolRequests}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, toolRequests: checked }))}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-red-400" />
              <div>
                <Label htmlFor="security-alerts" className="text-base">Security Alerts</Label>
                <p className="text-sm text-gray-400">Failed logins and security issues</p>
              </div>
            </div>
            <Switch
              id="security-alerts"
              checked={formData.securityAlerts}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, securityAlerts: checked }))}
            />
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-emerald-400" />
              <div>
                <Label htmlFor="system-updates" className="text-base">System Updates</Label>
                <p className="text-sm text-gray-400">System maintenance and updates</p>
              </div>
            </div>
            <Switch
              id="system-updates"
              checked={formData.systemUpdates}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, systemUpdates: checked }))}
            />
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-cyan-400" />
              <div>
                <Label htmlFor="user-activity" className="text-base">User Activity Digest</Label>
                <p className="text-sm text-gray-400">Daily summary of user activities</p>
              </div>
            </div>
            <Switch
              id="user-activity"
              checked={formData.userActivity}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, userActivity: checked }))}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-red-600 hover:bg-red-700"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
