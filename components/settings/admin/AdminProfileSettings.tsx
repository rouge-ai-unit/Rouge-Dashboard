"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Shield, Upload, Loader2, Save } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { toast } from "sonner";

export default function AdminProfileSettings() {
  const { data: session } = useSession();
  const { settings, updateSettings, saving } = useSettings();
  const [uploading, setUploading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: settings?.profile?.firstName || "",
    lastName: settings?.profile?.lastName || "",
    company: settings?.profile?.company || "",
    role: settings?.profile?.role || "",
    timezone: settings?.profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    avatar: settings?.profile?.avatar || "",
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFormData(prev => ({ ...prev, avatar: base64 }));
        toast.success("Image uploaded successfully");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    const success = await updateSettings({
      profile: formData,
    });

    if (success) {
      toast.success("Admin profile updated successfully");
    }
  };

  React.useEffect(() => {
    if (settings?.profile) {
      setFormData({
        firstName: settings.profile.firstName || "",
        lastName: settings.profile.lastName || "",
        company: settings.profile.company || "",
        role: settings.profile.role || "",
        timezone: settings.profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        avatar: settings.profile.avatar || "",
      });
    }
  }, [settings]);

  return (
    <Card className="bg-gray-800/50 border-gray-700/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5 text-red-400" />
          Admin Profile Information
        </CardTitle>
        <CardDescription>
          Manage your admin profile details and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Profile Picture */}
        <div className="flex items-center gap-6">
          <Avatar className="w-24 h-24">
            <AvatarImage src={formData.avatar} />
            <AvatarFallback className="text-2xl bg-red-600">
              {formData.firstName?.[0]?.toUpperCase() || session?.user?.name?.[0]?.toUpperCase() || "A"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Label htmlFor="avatar-upload" className="cursor-pointer">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors w-fit">
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                <span className="text-sm">Upload Photo</span>
              </div>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </Label>
            <p className="text-xs text-gray-400 mt-2">
              JPG, PNG or GIF. Max size 2MB.
            </p>
          </div>
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              placeholder="Enter first name"
              className="bg-gray-700/50 border-gray-600"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              placeholder="Enter last name"
              className="bg-gray-700/50 border-gray-600"
            />
          </div>
        </div>

        {/* Email (Read-only) */}
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              id="email"
              value={session?.user?.email || ""}
              disabled
              className="pl-10 bg-gray-700/30 border-gray-600 cursor-not-allowed"
            />
          </div>
          <p className="text-xs text-gray-400">Email cannot be changed</p>
        </div>

        {/* Admin Role (Read-only) */}
        <div className="space-y-2">
          <Label htmlFor="adminRole">Admin Role</Label>
          <div className="relative">
            <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-red-400" />
            <Input
              id="adminRole"
              value={(session?.user as any)?.role || "admin"}
              disabled
              className="pl-10 bg-gray-700/30 border-gray-600 cursor-not-allowed capitalize"
            />
          </div>
        </div>

        {/* Company */}
        <div className="space-y-2">
          <Label htmlFor="company">Organization</Label>
          <Input
            id="company"
            value={formData.company}
            onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
            placeholder="Enter organization name"
            className="bg-gray-700/50 border-gray-600"
          />
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            value={formData.timezone}
            onChange={(e) => setFormData(prev => ({ ...prev, timezone: e.target.value }))}
            placeholder="e.g., America/New_York"
            className="bg-gray-700/50 border-gray-600"
          />
          <p className="text-xs text-gray-400">
            Current timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </p>
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
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
