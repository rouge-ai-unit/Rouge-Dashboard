"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Mail, Send, Clock, RefreshCw, FileText, Database, Save, Loader2 } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

export default function ColdOutreachSettings() {
  const { settings, updateSettings, loading, saving } = useSettings();
  
  const [formData, setFormData] = useState({
    defaultCampaignSettings: {
      dailyLimit: 50,
      followUpDelay: 3,
      maxFollowUps: 5,
    },
    emailTemplates: {
      defaultSubject: "Following up on our conversation",
      defaultSignature: "Best regards,\n[Your Name]",
    },
    crmSync: {
      autoSync: false,
      syncInterval: 6,
    },
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings?.coldOutreach) {
      setFormData(settings.coldOutreach);
    }
  }, [settings]);

  useEffect(() => {
    if (!settings?.coldOutreach) return;
    const changed = JSON.stringify(formData) !== JSON.stringify(settings.coldOutreach);
    setHasChanges(changed);
  }, [formData, settings]);

  const handleChange = (section: string, field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    const success = await updateSettings({ coldOutreach: formData });
    if (success) {
      setHasChanges(false);
    }
  };

  const handleReset = () => {
    if (settings?.coldOutreach) {
      setFormData(settings.coldOutreach);
      setHasChanges(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Campaign Settings */}
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-400" />
            Campaign Settings
          </CardTitle>
          <CardDescription>
            Configure default settings for cold outreach campaigns
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dailyLimit">Daily Email Limit</Label>
            <Input
              id="dailyLimit"
              type="number"
              min="1"
              max="1000"
              value={formData.defaultCampaignSettings.dailyLimit}
              onChange={(e) => handleChange("defaultCampaignSettings", "dailyLimit", parseInt(e.target.value))}
              className="bg-gray-900/50 border-gray-700"
            />
            <p className="text-xs text-gray-400">
              Maximum number of emails to send per day (1-1000)
            </p>
          </div>

          <Separator className="bg-gray-700/50" />

          <div className="space-y-2">
            <Label htmlFor="followUpDelay" className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              Follow-up Delay (days)
            </Label>
            <Select
              value={formData.defaultCampaignSettings.followUpDelay.toString()}
              onValueChange={(value) => handleChange("defaultCampaignSettings", "followUpDelay", parseInt(value))}
            >
              <SelectTrigger className="bg-gray-900/50 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="1">1 day</SelectItem>
                <SelectItem value="2">2 days</SelectItem>
                <SelectItem value="3">3 days</SelectItem>
                <SelectItem value="5">5 days</SelectItem>
                <SelectItem value="7">1 week</SelectItem>
                <SelectItem value="14">2 weeks</SelectItem>
                <SelectItem value="30">1 month</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">
              Time to wait before sending follow-up emails
            </p>
          </div>

          <Separator className="bg-gray-700/50" />

          <div className="space-y-2">
            <Label htmlFor="maxFollowUps">Maximum Follow-ups</Label>
            <Select
              value={formData.defaultCampaignSettings.maxFollowUps.toString()}
              onValueChange={(value) => handleChange("defaultCampaignSettings", "maxFollowUps", parseInt(value))}
            >
              <SelectTrigger className="bg-gray-900/50 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="0">No follow-ups</SelectItem>
                <SelectItem value="1">1 follow-up</SelectItem>
                <SelectItem value="2">2 follow-ups</SelectItem>
                <SelectItem value="3">3 follow-ups</SelectItem>
                <SelectItem value="5">5 follow-ups</SelectItem>
                <SelectItem value="10">10 follow-ups</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">
              Maximum number of follow-up emails per contact
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Email Templates */}
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-400" />
            Email Templates
          </CardTitle>
          <CardDescription>
            Set default templates for your outreach emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultSubject">Default Subject Line</Label>
            <Input
              id="defaultSubject"
              placeholder="Following up on our conversation"
              value={formData.emailTemplates.defaultSubject}
              onChange={(e) => handleChange("emailTemplates", "defaultSubject", e.target.value)}
              className="bg-gray-900/50 border-gray-700"
            />
            <p className="text-xs text-gray-400">
              Default subject line for new campaigns
            </p>
          </div>

          <Separator className="bg-gray-700/50" />

          <div className="space-y-2">
            <Label htmlFor="defaultSignature">Default Email Signature</Label>
            <Textarea
              id="defaultSignature"
              placeholder="Best regards,&#10;[Your Name]"
              value={formData.emailTemplates.defaultSignature}
              onChange={(e) => handleChange("emailTemplates", "defaultSignature", e.target.value)}
              className="bg-gray-900/50 border-gray-700 min-h-[100px]"
            />
            <p className="text-xs text-gray-400">
              Your default email signature. Use [Your Name] as a placeholder.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CRM Sync */}
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-purple-400" />
            CRM Synchronization
          </CardTitle>
          <CardDescription>
            Configure automatic syncing with your CRM system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-blue-400" />
                Auto-Sync
              </Label>
              <p className="text-sm text-gray-400">
                Automatically sync contacts and campaigns with CRM
              </p>
            </div>
            <Switch
              checked={formData.crmSync.autoSync}
              onCheckedChange={(checked) => handleChange("crmSync", "autoSync", checked)}
            />
          </div>

          <Separator className="bg-gray-700/50" />

          <div className="space-y-2">
            <Label htmlFor="syncInterval">Sync Interval</Label>
            <Select
              value={formData.crmSync.syncInterval.toString()}
              onValueChange={(value) => handleChange("crmSync", "syncInterval", parseInt(value))}
              disabled={!formData.crmSync.autoSync}
            >
              <SelectTrigger className="bg-gray-900/50 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="1">Every hour</SelectItem>
                <SelectItem value="3">Every 3 hours</SelectItem>
                <SelectItem value="6">Every 6 hours</SelectItem>
                <SelectItem value="12">Every 12 hours</SelectItem>
                <SelectItem value="24">Once daily</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">
              How often to sync data with your CRM
            </p>
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
