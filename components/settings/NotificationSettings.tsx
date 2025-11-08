"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Bell, Mail, Volume2, Clock, Save, Loader2 } from "lucide-react";
import { useNotificationSettings } from "@/hooks/useSettings";

export default function NotificationSettings() {
  const { notifications, updateNotifications, loading, saving } = useNotificationSettings();
  
  const [formData, setFormData] = useState({
    email: true,
    push: true,
    sound: false,
    pollInterval: 30,
    ticketUpdates: true,
    workTracker: true,
    campaignUpdates: true,
    contactUpdates: true,
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (notifications) {
      setFormData(notifications);
    }
  }, [notifications]);

  useEffect(() => {
    if (!notifications) return;
    const changed = JSON.stringify(formData) !== JSON.stringify(notifications);
    setHasChanges(changed);
  }, [formData, notifications]);

  const handleToggle = (field: keyof typeof formData) => {
    setFormData(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handlePollIntervalChange = (value: string) => {
    setFormData(prev => ({ ...prev, pollInterval: parseInt(value) }));
  };

  const handleSave = async () => {
    const success = await updateNotifications(formData);
    if (success) {
      setHasChanges(false);
    }
  };

  const handleReset = () => {
    if (notifications) {
      setFormData(notifications);
      setHasChanges(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* General Notifications */}
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" />
            General Notifications
          </CardTitle>
          <CardDescription>
            Configure how you receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-400" />
                Email Notifications
              </Label>
              <p className="text-sm text-gray-400">
                Receive notifications via email
              </p>
            </div>
            <Switch
              checked={formData.email}
              onCheckedChange={() => handleToggle('email')}
            />
          </div>

          <Separator className="bg-gray-700/50" />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-purple-400" />
                Push Notifications
              </Label>
              <p className="text-sm text-gray-400">
                Receive push notifications in the app
              </p>
            </div>
            <Switch
              checked={formData.push}
              onCheckedChange={() => handleToggle('push')}
            />
          </div>

          <Separator className="bg-gray-700/50" />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-green-400" />
                Sound Alerts
              </Label>
              <p className="text-sm text-gray-400">
                Play sound when receiving notifications
              </p>
            </div>
            <Switch
              checked={formData.sound}
              onCheckedChange={() => handleToggle('sound')}
            />
          </div>

          <Separator className="bg-gray-700/50" />

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400" />
              Notification Check Interval
            </Label>
            <Select
              value={formData.pollInterval.toString()}
              onValueChange={handlePollIntervalChange}
            >
              <SelectTrigger className="bg-gray-900/50 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="10">Every 10 seconds</SelectItem>
                <SelectItem value="30">Every 30 seconds</SelectItem>
                <SelectItem value="60">Every minute</SelectItem>
                <SelectItem value="120">Every 2 minutes</SelectItem>
                <SelectItem value="300">Every 5 minutes</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">
              How often to check for new notifications
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Feature-Specific Notifications */}
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <CardTitle>Feature Notifications</CardTitle>
          <CardDescription>
            Choose which features send you notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Ticket Updates</Label>
              <p className="text-sm text-gray-400">
                Notifications for ticket status changes and comments
              </p>
            </div>
            <Switch
              checked={formData.ticketUpdates}
              onCheckedChange={() => handleToggle('ticketUpdates')}
            />
          </div>

          <Separator className="bg-gray-700/50" />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Work Tracker</Label>
              <p className="text-sm text-gray-400">
                Notifications for task assignments and deadlines
              </p>
            </div>
            <Switch
              checked={formData.workTracker}
              onCheckedChange={() => handleToggle('workTracker')}
            />
          </div>

          <Separator className="bg-gray-700/50" />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Campaign Updates</Label>
              <p className="text-sm text-gray-400">
                Notifications for cold outreach campaign status
              </p>
            </div>
            <Switch
              checked={formData.campaignUpdates}
              onCheckedChange={() => handleToggle('campaignUpdates')}
            />
          </div>

          <Separator className="bg-gray-700/50" />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Contact Updates</Label>
              <p className="text-sm text-gray-400">
                Notifications for contact responses and interactions
              </p>
            </div>
            <Switch
              checked={formData.contactUpdates}
              onCheckedChange={() => handleToggle('contactUpdates')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Actions */}
      {hasChanges && (
        <Card className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-blue-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-300">
                You have unsaved changes
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  disabled={saving}
                  className="border-gray-700 hover:bg-gray-800"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
