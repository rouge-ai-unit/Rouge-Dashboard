"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Lock, Key, Clock, AlertTriangle, Save, Loader2, Copy, Trash2, Plus } from "lucide-react";
import { useSecuritySettings } from "@/hooks/useSettings";
import { toast } from "sonner";

export default function SecuritySettings() {
  const { security, updateSecurity, loading, saving } = useSecuritySettings();
  
  const [formData, setFormData] = useState({
    twoFactorEnabled: false,
    sessionTimeout: 60,
    apiKeys: [] as Array<{
      id: string;
      name: string;
      key: string;
      createdAt: string;
      lastUsed?: string;
    }>,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [showNewApiKey, setShowNewApiKey] = useState(false);
  const [newApiKeyName, setNewApiKeyName] = useState("");

  useEffect(() => {
    if (security) {
      setFormData({
        twoFactorEnabled: security.twoFactorEnabled,
        sessionTimeout: security.sessionTimeout,
        apiKeys: security.apiKeys || [],
      });
    }
  }, [security]);

  useEffect(() => {
    if (!security) return;
    const changed = JSON.stringify(formData) !== JSON.stringify({
      twoFactorEnabled: security.twoFactorEnabled,
      sessionTimeout: security.sessionTimeout,
      apiKeys: security.apiKeys || [],
    });
    setHasChanges(changed);
  }, [formData, security]);

  const handleToggle2FA = () => {
    setFormData(prev => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }));
  };

  const handleSessionTimeoutChange = (value: string) => {
    setFormData(prev => ({ ...prev, sessionTimeout: parseInt(value) }));
  };

  const generateApiKey = () => {
    const key = `rg_${Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')}`;
    return key;
  };

  const handleAddApiKey = () => {
    if (!newApiKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    const newKey = {
      id: crypto.randomUUID(),
      name: newApiKeyName,
      key: generateApiKey(),
      createdAt: new Date().toISOString(),
    };

    setFormData(prev => ({
      ...prev,
      apiKeys: [...prev.apiKeys, newKey],
    }));

    setNewApiKeyName("");
    setShowNewApiKey(false);
    toast.success("API key created successfully");
  };

  const handleDeleteApiKey = (id: string) => {
    setFormData(prev => ({
      ...prev,
      apiKeys: prev.apiKeys.filter(key => key.id !== id),
    }));
    toast.success("API key deleted");
  };

  const handleCopyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard");
  };

  const handleSave = async () => {
    const success = await updateSecurity(formData);
    if (success) {
      setHasChanges(false);
    }
  };

  const handleReset = () => {
    if (security) {
      setFormData({
        twoFactorEnabled: security.twoFactorEnabled,
        sessionTimeout: security.sessionTimeout,
        apiKeys: security.apiKeys || [],
      });
      setHasChanges(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Two-Factor Authentication */}
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-yellow-900/20 border-yellow-500/30">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-300">
              Two-factor authentication is currently in development. This feature will be available soon.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable 2FA</Label>
              <p className="text-sm text-gray-400">
                Require a verification code in addition to your password
              </p>
            </div>
            <Switch
              checked={formData.twoFactorEnabled}
              onCheckedChange={handleToggle2FA}
              disabled
            />
          </div>
        </CardContent>
      </Card>

      {/* Session Management */}
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />
            Session Management
          </CardTitle>
          <CardDescription>
            Control how long you stay logged in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Session Timeout</Label>
            <Select
              value={formData.sessionTimeout.toString()}
              onValueChange={handleSessionTimeoutChange}
            >
              <SelectTrigger className="bg-gray-900/50 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="5">5 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 hour</SelectItem>
                <SelectItem value="120">2 hours</SelectItem>
                <SelectItem value="240">4 hours</SelectItem>
                <SelectItem value="480">8 hours</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">
              You&apos;ll be automatically logged out after this period of inactivity
            </p>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-green-400" />
                API Keys
              </CardTitle>
              <CardDescription>
                Manage API keys for programmatic access
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewApiKey(true)}
              className="border-gray-700 hover:bg-gray-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Key
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {showNewApiKey && (
            <Card className="bg-gray-900/50 border-gray-700/50">
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="apiKeyName">API Key Name</Label>
                  <Input
                    id="apiKeyName"
                    placeholder="My API Key"
                    value={newApiKeyName}
                    onChange={(e) => setNewApiKeyName(e.target.value)}
                    className="bg-gray-900/50 border-gray-700"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddApiKey}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Create Key
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowNewApiKey(false);
                      setNewApiKeyName("");
                    }}
                    className="border-gray-700 hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {formData.apiKeys.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Key className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No API keys created yet</p>
              <p className="text-sm">Create an API key to access the platform programmatically</p>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.apiKeys.map((apiKey) => (
                <Card key={apiKey.id} className="bg-gray-900/50 border-gray-700/50">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{apiKey.name}</p>
                          <Badge variant="outline" className="border-green-500/30 text-green-400">
                            Active
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-gray-800/50 px-2 py-1 rounded border border-gray-700 font-mono">
                            {apiKey.key.substring(0, 20)}...
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyApiKey(apiKey.key)}
                            className="h-7"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-400">
                          <span>Created: {new Date(apiKey.createdAt).toLocaleDateString()}</span>
                          {apiKey.lastUsed && (
                            <span>Last used: {new Date(apiKey.lastUsed).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteApiKey(apiKey.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
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
