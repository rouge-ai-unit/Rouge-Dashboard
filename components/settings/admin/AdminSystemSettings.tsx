"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Settings, Palette, Globe, Calendar, Clock, Database, FileDown, Loader2, Save } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { toast } from "sonner";

export default function AdminSystemSettings() {
  const { settings, updateSettings, saving } = useSettings();

  const [formData, setFormData] = useState({
    theme: settings?.system?.theme ?? "system",
    language: settings?.system?.language ?? "en",
    dateFormat: settings?.system?.dateFormat ?? "MM/dd/yyyy",
    timeFormat: settings?.system?.timeFormat ?? "12h",
    dataRetention: settings?.system?.dataRetention ?? 365,
    exportFormat: settings?.system?.exportFormat ?? "csv",
  });

  const handleSave = async () => {
    const success = await updateSettings({
      system: formData,
    });

    if (success) {
      toast.success("System settings updated");
    }
  };

  React.useEffect(() => {
    if (settings?.system) {
      setFormData({
        theme: settings.system.theme ?? "system",
        language: settings.system.language ?? "en",
        dateFormat: settings.system.dateFormat ?? "MM/dd/yyyy",
        timeFormat: settings.system.timeFormat ?? "12h",
        dataRetention: settings.system.dataRetention ?? 365,
        exportFormat: settings.system.exportFormat ?? "csv",
      });
    }
  }, [settings]);

  return (
    <Card className="bg-gray-800/50 border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-red-400" />
          System Preferences
        </CardTitle>
        <CardDescription>
          Configure system-wide settings and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Appearance */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Palette className="w-4 h-4" />
            Appearance
          </h3>

          <div className="space-y-2">
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={formData.theme}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, theme: value }))}
            >
              <SelectTrigger id="theme" className="bg-gray-700/50 border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">Choose your preferred color theme</p>
          </div>
        </div>

        {/* Localization */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Localization
          </h3>

          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select
              value={formData.language}
              onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}
            >
              <SelectTrigger id="language" className="bg-gray-700/50 border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="zh">Chinese</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateFormat">Date Format</Label>
            <Select
              value={formData.dateFormat}
              onValueChange={(value) => setFormData(prev => ({ ...prev, dateFormat: value }))}
            >
              <SelectTrigger id="dateFormat" className="bg-gray-700/50 border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MM/dd/yyyy">MM/DD/YYYY (US)</SelectItem>
                <SelectItem value="dd/MM/yyyy">DD/MM/YYYY (EU)</SelectItem>
                <SelectItem value="yyyy-MM-dd">YYYY-MM-DD (ISO)</SelectItem>
                <SelectItem value="dd.MM.yyyy">DD.MM.YYYY</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="timeFormat">Time Format</Label>
            <Select
              value={formData.timeFormat}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, timeFormat: value }))}
            >
              <SelectTrigger id="timeFormat" className="bg-gray-700/50 border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                <SelectItem value="24h">24-hour</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Data Management */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Data Management
          </h3>

          <div className="space-y-2">
            <Label htmlFor="dataRetention">Data Retention Period (days)</Label>
            <Input
              id="dataRetention"
              type="number"
              min="30"
              max="3650"
              value={formData.dataRetention}
              onChange={(e) => setFormData(prev => ({ ...prev, dataRetention: parseInt(e.target.value) || 365 }))}
              className="bg-gray-700/50 border-gray-600"
            />
            <p className="text-xs text-gray-400">
              How long to keep activity logs and analytics data (30-3650 days)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="exportFormat">Default Export Format</Label>
            <Select
              value={formData.exportFormat}
              onValueChange={(value: any) => setFormData(prev => ({ ...prev, exportFormat: value }))}
            >
              <SelectTrigger id="exportFormat" className="bg-gray-700/50 border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">
              Preferred format for exporting data
            </p>
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
                Save Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
