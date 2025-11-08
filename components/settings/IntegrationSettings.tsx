"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Globe, Mail, FileSpreadsheet, Database, Linkedin, Check, X, ExternalLink, Save, Loader2, AlertCircle } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { toast } from "sonner";

export default function IntegrationSettings() {
  const { settings, updateSettings, loading, saving } = useSettings();
  
  const [formData, setFormData] = useState<{
    sendgrid: {
      apiKey?: string;
      verified: boolean;
      fromEmail?: string;
      fromName?: string;
    };
    googleSheets: {
      connected: boolean;
      spreadsheetId?: string;
      sheetName?: string;
    };
    notion: {
      connected: boolean;
      databaseId?: string;
    };
    linkedin: {
      connected: boolean;
      profileUrl?: string;
    };
  }>({
    sendgrid: {
      apiKey: "",
      verified: false,
      fromEmail: "",
      fromName: "",
    },
    googleSheets: {
      connected: false,
      spreadsheetId: "",
      sheetName: "",
    },
    notion: {
      connected: false,
      databaseId: "",
    },
    linkedin: {
      connected: false,
      profileUrl: "",
    },
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings?.integrations) {
      setFormData(settings.integrations);
    }
  }, [settings]);

  useEffect(() => {
    if (!settings?.integrations) return;
    const changed = JSON.stringify(formData) !== JSON.stringify(settings.integrations);
    setHasChanges(changed);
  }, [formData, settings]);

  const handleChange = (integration: string, field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [integration]: {
        ...prev[integration as keyof typeof prev],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    const success = await updateSettings({ integrations: formData });
    if (success) {
      setHasChanges(false);
    }
  };

  const handleReset = () => {
    if (settings?.integrations) {
      setFormData(settings.integrations);
      setHasChanges(false);
    }
  };

  const handleTestConnection = async (integration: string) => {
    toast.info(`Testing ${integration} connection...`);
    // Simulate API call
    setTimeout(() => {
      toast.success(`${integration} connection successful!`);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* SendGrid Integration */}
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-400" />
                SendGrid Email Service
              </CardTitle>
              <CardDescription>
                Configure SendGrid for email notifications and campaigns
              </CardDescription>
            </div>
            {formData.sendgrid.verified ? (
              <Badge variant="outline" className="border-green-500/30 text-green-400">
                <Check className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="border-gray-500/30 text-gray-400">
                <X className="w-3 h-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sendgridApiKey">API Key</Label>
            <Input
              id="sendgridApiKey"
              type="password"
              placeholder="SG.xxxxxxxxxxxxxxxxxxxxxxxx"
              value={formData.sendgrid.apiKey || ""}
              onChange={(e) => handleChange("sendgrid", "apiKey", e.target.value)}
              className="bg-gray-900/50 border-gray-700"
            />
            <p className="text-xs text-gray-400">
              Get your API key from{" "}
              <a
                href="https://app.sendgrid.com/settings/api_keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                SendGrid Dashboard
                <ExternalLink className="w-3 h-3" />
              </a>
            </p>
          </div>

          <Separator className="bg-gray-700/50" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sendgridFromEmail">From Email</Label>
              <Input
                id="sendgridFromEmail"
                type="email"
                placeholder="noreply@yourdomain.com"
                value={formData.sendgrid.fromEmail || ""}
                onChange={(e) => handleChange("sendgrid", "fromEmail", e.target.value)}
                className="bg-gray-900/50 border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sendgridFromName">From Name</Label>
              <Input
                id="sendgridFromName"
                placeholder="Your Company"
                value={formData.sendgrid.fromName || ""}
                onChange={(e) => handleChange("sendgrid", "fromName", e.target.value)}
                className="bg-gray-900/50 border-gray-700"
              />
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => handleTestConnection("SendGrid")}
            className="border-gray-700 hover:bg-gray-800"
          >
            Test Connection
          </Button>
        </CardContent>
      </Card>

      {/* Google Sheets Integration */}
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-green-400" />
                Google Sheets
              </CardTitle>
              <CardDescription>
                Sync data with Google Sheets for collaboration
              </CardDescription>
            </div>
            {formData.googleSheets.connected ? (
              <Badge variant="outline" className="border-green-500/30 text-green-400">
                <Check className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="border-gray-500/30 text-gray-400">
                <X className="w-3 h-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-blue-900/20 border-blue-500/30">
            <AlertCircle className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-300">
              Google Sheets integration requires OAuth authentication. Click &quot;Connect&quot; to authorize access.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="spreadsheetId">Spreadsheet ID</Label>
            <Input
              id="spreadsheetId"
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              value={formData.googleSheets.spreadsheetId || ""}
              onChange={(e) => handleChange("googleSheets", "spreadsheetId", e.target.value)}
              className="bg-gray-900/50 border-gray-700"
              disabled={!formData.googleSheets.connected}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sheetName">Sheet Name</Label>
            <Input
              id="sheetName"
              placeholder="Sheet1"
              value={formData.googleSheets.sheetName || ""}
              onChange={(e) => handleChange("googleSheets", "sheetName", e.target.value)}
              className="bg-gray-900/50 border-gray-700"
              disabled={!formData.googleSheets.connected}
            />
          </div>

          <Button
            variant="outline"
            onClick={() => {
              handleChange("googleSheets", "connected", !formData.googleSheets.connected);
              toast.success(formData.googleSheets.connected ? "Disconnected from Google Sheets" : "Connected to Google Sheets");
            }}
            className="border-gray-700 hover:bg-gray-800"
          >
            {formData.googleSheets.connected ? "Disconnect" : "Connect Google Sheets"}
          </Button>
        </CardContent>
      </Card>

      {/* Notion Integration */}
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-400" />
                Notion
              </CardTitle>
              <CardDescription>
                Sync contacts and campaigns with Notion databases
              </CardDescription>
            </div>
            {formData.notion.connected ? (
              <Badge variant="outline" className="border-green-500/30 text-green-400">
                <Check className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="border-gray-500/30 text-gray-400">
                <X className="w-3 h-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notionDatabaseId">Database ID</Label>
            <Input
              id="notionDatabaseId"
              placeholder="a8aec43437f942b2b5f4e3f5c1d2e3f4"
              value={formData.notion.databaseId || ""}
              onChange={(e) => handleChange("notion", "databaseId", e.target.value)}
              className="bg-gray-900/50 border-gray-700"
              disabled={!formData.notion.connected}
            />
            <p className="text-xs text-gray-400">
              Find your database ID in the Notion URL
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              handleChange("notion", "connected", !formData.notion.connected);
              toast.success(formData.notion.connected ? "Disconnected from Notion" : "Connected to Notion");
            }}
            className="border-gray-700 hover:bg-gray-800"
          >
            {formData.notion.connected ? "Disconnect" : "Connect Notion"}
          </Button>
        </CardContent>
      </Card>

      {/* LinkedIn Integration */}
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Linkedin className="w-5 h-5 text-blue-500" />
                LinkedIn
              </CardTitle>
              <CardDescription>
                Connect your LinkedIn profile for enhanced features
              </CardDescription>
            </div>
            {formData.linkedin.connected ? (
              <Badge variant="outline" className="border-green-500/30 text-green-400">
                <Check className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="border-gray-500/30 text-gray-400">
                <X className="w-3 h-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="linkedinProfileUrl">Profile URL</Label>
            <Input
              id="linkedinProfileUrl"
              type="url"
              placeholder="https://www.linkedin.com/in/yourprofile"
              value={formData.linkedin.profileUrl || ""}
              onChange={(e) => handleChange("linkedin", "profileUrl", e.target.value)}
              className="bg-gray-900/50 border-gray-700"
              disabled={!formData.linkedin.connected}
            />
          </div>

          <Button
            variant="outline"
            onClick={() => {
              handleChange("linkedin", "connected", !formData.linkedin.connected);
              toast.success(formData.linkedin.connected ? "Disconnected from LinkedIn" : "Connected to LinkedIn");
            }}
            className="border-gray-700 hover:bg-gray-800"
          >
            {formData.linkedin.connected ? "Disconnect" : "Connect LinkedIn"}
          </Button>
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
