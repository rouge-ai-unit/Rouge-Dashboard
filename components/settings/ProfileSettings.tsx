"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Briefcase, MapPin, Save, Loader2, Upload, Check } from "lucide-react";
import { useProfileSettings } from "@/hooks/useSettings";
import { toast } from "sonner";

// Get all available timezones dynamically
const getAllTimezones = () => {
  const timezones = Intl.supportedValuesOf('timeZone');
  return timezones.map(tz => ({
    value: tz,
    label: tz.replace(/_/g, ' ')
  }));
};

// Get user's current timezone
const getUserTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
};

export default function ProfileSettings() {
  const { data: session } = useSession();
  const { profile, updateProfile, loading, saving } = useProfileSettings();
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    company: "",
    role: "",
    timezone: getUserTimezone(),
    avatar: "",
  });

  const [timezones] = useState(() => getAllTimezones());

  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form data
  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        company: profile.company || "",
        role: profile.role || "",
        timezone: profile.timezone || getUserTimezone(),
        avatar: profile.avatar || "",
      });
    }
  }, [profile]);

  // Track changes
  useEffect(() => {
    if (!profile) return;
    
    const changed = 
      formData.firstName !== (profile.firstName || "") ||
      formData.lastName !== (profile.lastName || "") ||
      formData.company !== (profile.company || "") ||
      formData.role !== (profile.role || "") ||
      formData.timezone !== (profile.timezone || "") ||
      formData.avatar !== (profile.avatar || "");
    
    setHasChanges(changed);
  }, [formData, profile]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    const success = await updateProfile(formData);
    if (success) {
      setHasChanges(false);
    }
  };

  const handleReset = () => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || "",
        lastName: profile.lastName || "",
        company: profile.company || "",
        role: profile.role || "",
        timezone: profile.timezone || getUserTimezone(),
        avatar: profile.avatar || "",
      });
      setHasChanges(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload a valid image file");
      return;
    }

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        handleChange("avatar", base64);
        toast.success("Image uploaded successfully");
      };
      reader.onerror = () => {
        toast.error("Failed to upload image");
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error("Failed to process image");
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Picture */}
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            Profile Picture
          </CardTitle>
          <CardDescription>
            Update your profile picture and avatar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-6">
            <Avatar className="w-24 h-24 border-2 border-blue-500/30 flex-shrink-0">
              <AvatarImage src={formData.avatar || session?.user?.image || undefined} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-600 to-purple-600">
                {formData.firstName?.[0]?.toUpperCase() || session?.user?.name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="avatar">Avatar URL</Label>
                <Input
                  id="avatar"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={formData.avatar}
                  onChange={(e) => handleChange("avatar", e.target.value)}
                  className="bg-gray-900/50 border-gray-700"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="avatarUpload">Or Upload Image</Label>
                <div className="flex gap-2">
                  <Input
                    id="avatarUpload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="bg-gray-900/50 border-gray-700 cursor-pointer"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('avatarUpload')?.click()}
                    className="border-gray-700 hover:bg-gray-800 whitespace-nowrap"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                </div>
                <p className="text-xs text-gray-400">
                  Upload an image from your device (max 2MB, JPG/PNG)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-400" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Update your personal details and contact information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="John"
                value={formData.firstName}
                onChange={(e) => handleChange("firstName", e.target.value)}
                className="bg-gray-900/50 border-gray-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                value={formData.lastName}
                onChange={(e) => handleChange("lastName", e.target.value)}
                className="bg-gray-900/50 border-gray-700"
              />
            </div>
          </div>

          <Separator className="bg-gray-700/50" />

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={session?.user?.email || ""}
                disabled
                className="bg-gray-900/30 border-gray-700 pl-10 cursor-not-allowed"
              />
              <Badge 
                variant="outline" 
                className="absolute right-3 top-2.5 border-green-500/30 text-green-400"
              >
                <Check className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            </div>
            <p className="text-xs text-gray-400">
              Email cannot be changed. Contact support if you need to update it.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Professional Information */}
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-blue-400" />
            Professional Information
          </CardTitle>
          <CardDescription>
            Your work-related details and organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              placeholder="Rouge VC"
              value={formData.company}
              onChange={(e) => handleChange("company", e.target.value)}
              className="bg-gray-900/50 border-gray-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Job Title / Role</Label>
            <Input
              id="role"
              placeholder="AI Engineer"
              value={formData.role}
              onChange={(e) => handleChange("role", e.target.value)}
              className="bg-gray-900/50 border-gray-700"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="unit">Unit / Department</Label>
            <div className="relative">
              <Input
                id="unit"
                value={(session?.user as any)?.unit || "Not assigned"}
                disabled
                className="bg-gray-900/30 border-gray-700 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-gray-400">
              Unit assignment is managed by administrators
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Location & Timezone */}
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-400" />
            Location & Timezone
          </CardTitle>
          <CardDescription>
            Set your timezone for accurate time displays
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select
              value={formData.timezone}
              onValueChange={(value) => handleChange("timezone", value)}
            >
              <SelectTrigger className="bg-gray-900/50 border-gray-700">
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 max-h-[300px]">
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-400">
              Current time: {new Date().toLocaleString('en-US', { 
                timeZone: formData.timezone || getUserTimezone(),
                dateStyle: 'medium',
                timeStyle: 'short'
              })}
            </p>
            <p className="text-xs text-blue-400">
              Detected timezone: {getUserTimezone()}
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
