"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Palette, Globe, Calendar, Clock, Database, FileDown, Save, Loader2, Moon, Sun, Monitor } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSettings";
import { useTheme } from "next-themes";

export default function SystemSettings() {
  const { system, updateSystem, loading, saving } = useSystemSettings();
  const { theme, setTheme } = useTheme();
  
  const [formData, setFormData] = useState({
    theme: "system" as "light" | "dark" | "system",
    language: "en",
    dateFormat: "MM/dd/yyyy",
    timeFormat: "12h" as "12h" | "24h",
    dataRetention: 365,
    exportFormat: "csv" as "csv" | "json" | "xlsx",
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (system) {
      setFormData(system);
    }
  }, [system]);

  useEffect(() => {
    if (!system) return;
    const changed = JSON.stringify(formData) !== JSON.stringify(system);
    setHasChanges(changed);
  }, [formData, system]);

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Apply theme immediately
    if (field === "theme") {
      setTheme(value as string);
    }
  };

  const handleSave = async () => {
    const success = await updateSystem(formData);
    if (success) {
      setHasChanges(false);
    }
  };

  const handleReset = () => {
    if (system) {
      setFormData(system);
      setHasChanges(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-blue-400" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize the look and feel of the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Theme</Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={formData.theme === "light" ? "default" : "outline"}
                onClick={() => handleChange("theme", "light")}
                className={formData.theme === "light" ? "bg-blue-600" : "border-gray-700 hover:bg-gray-800"}
              >
                <Sun className="w-4 h-4 mr-2" />
                Light
              </Button>
              <Button
                variant={formData.theme === "dark" ? "default" : "outline"}
                onClick={() => handleChange("theme", "dark")}
                className={formData.theme === "dark" ? "bg-blue-600" : "border-gray-700 hover:bg-gray-800"}
              >
                <Moon className="w-4 h-4 mr-2" />
                Dark
              </Button>
              <Button
                variant={formData.theme === "system" ? "default" : "outline"}
                onClick={() => handleChange("theme", "system")}
                className={formData.theme === "system" ? "bg-blue-600" : "border-gray-700 hover:bg-gray-800"}
              >
                <Monitor className="w-4 h-4 mr-2" />
                System
              </Button>
            </div>
            <p className="text-xs text-gray-400">
              Choose your preferred color scheme
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Localization */}
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-green-400" />
            Localization
          </CardTitle>
          <CardDescription>
            Set your language and regional preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Language</Label>
            <Select
              value={formData.language}
              onValueChange={(value) => handleChange("language", value)}
            >
              <SelectTrigger className="bg-gray-900/50 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
                <SelectItem value="ja">日本語</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator className="bg-gray-700/50" />

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              Date Format
            </Label>
            <Select
              value={formData.dateFormat}
              onValueChange={(value) => handleChange("dateFormat", value)}
            >
              <SelectTrigger className="bg-gray-900/50 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="MM/dd/yyyy">MM/DD/YYYY (US)</SelectItem>
                <SelectItem value="dd/MM/yyyy">DD/MM/YYYY (EU)</SelectItem>
                <SelectItem value="yyyy-MM-dd">YYYY-MM-DD (ISO)</SelectItem>
                <SelectItem value="dd.MM.yyyy">DD.MM.YYYY (DE)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">
              Example: {new Date().toLocaleDateString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
              })}
            </p>
          </div>

          <Separator className="bg-gray-700/50" />

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              Time Format
            </Label>
            <Select
              value={formData.timeFormat}
              onValueChange={(value) => handleChange("timeFormat", value)}
            >
              <SelectTrigger className="bg-gray-900/50 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="12h">12-hour (AM/PM)</SelectItem>
                <SelectItem value="24h">24-hour</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">
              Example: {new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: formData.timeFormat === '12h'
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-yellow-400" />
            Data Management
          </CardTitle>
          <CardDescription>
            Control how your data is stored and exported
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Data Retention Period</Label>
            <Select
              value={formData.dataRetention.toString()}
              onValueChange={(value) => handleChange("dataRetention", parseInt(value))}
            >
              <SelectTrigger className="bg-gray-900/50 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="30">30 days</SelectItem>
                <SelectItem value="90">90 days</SelectItem>
                <SelectItem value="180">6 months</SelectItem>
                <SelectItem value="365">1 year</SelectItem>
                <SelectItem value="730">2 years</SelectItem>
                <SelectItem value="1825">5 years</SelectItem>
                <SelectItem value="3650">10 years</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">
              How long to keep your data before automatic deletion
            </p>
          </div>

          <Separator className="bg-gray-700/50" />

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileDown className="w-4 h-4 text-green-400" />
              Default Export Format
            </Label>
            <Select
              value={formData.exportFormat}
              onValueChange={(value) => handleChange("exportFormat", value)}
            >
              <SelectTrigger className="bg-gray-900/50 border-gray-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700">
                <SelectItem value="csv">CSV (Comma-separated)</SelectItem>
                <SelectItem value="json">JSON (JavaScript Object)</SelectItem>
                <SelectItem value="xlsx">XLSX (Excel)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">
              Preferred format when exporting data
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
