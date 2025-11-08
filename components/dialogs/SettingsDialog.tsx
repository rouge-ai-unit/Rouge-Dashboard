"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Loader2,
  Save,
  ExternalLink,
  Check,
  X,
  AlertCircle
} from "lucide-react";
import { useRouter } from "next/navigation";

export type SettingsDialogProps = { 
  open: boolean; 
  onOpenChangeAction: (open: boolean) => void;
};

export default function SettingsDialog({ open, onOpenChangeAction }: SettingsDialogProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  // Redirect to full settings page
  const handleOpenFullSettings = () => {
    onOpenChangeAction(false);
    router.push('/settings');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="bg-gray-900/95 backdrop-blur-md text-gray-100 border-gray-700/50 sm:max-w-2xl max-h-[85vh] shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Quick Settings
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Manage your account preferences and settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick Settings Preview */}
          <Card className="bg-gray-800/50 border-gray-700/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                Account Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-300">Name</p>
                  <p className="text-xs text-gray-400">{session?.user?.name || 'Not set'}</p>
                </div>
                <Badge variant="outline" className="border-blue-500/30 text-blue-400">
                  {(session?.user as any)?.role || 'Member'}
                </Badge>
              </div>
              
              <Separator className="bg-gray-700/50" />
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-300">Email</p>
                  <p className="text-xs text-gray-400">{session?.user?.email || 'Not set'}</p>
                </div>
                <Badge variant="outline" className="border-green-500/30 text-green-400">
                  <Check className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              </div>

              <Separator className="bg-gray-700/50" />

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-300">Unit</p>
                  <p className="text-xs text-gray-400">{(session?.user as any)?.unit || 'Not assigned'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="border-gray-700 hover:bg-gray-800 text-white"
              onClick={handleOpenFullSettings}
            >
              <User className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
            <Button
              variant="outline"
              className="border-gray-700 hover:bg-gray-800 text-white"
              onClick={handleOpenFullSettings}
            >
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </Button>
            <Button
              variant="outline"
              className="border-gray-700 hover:bg-gray-800 text-white"
              onClick={handleOpenFullSettings}
            >
              <Shield className="w-4 h-4 mr-2" />
              Security
            </Button>
            <Button
              variant="outline"
              className="border-gray-700 hover:bg-gray-800 text-white"
              onClick={handleOpenFullSettings}
            >
              <Palette className="w-4 h-4 mr-2" />
              Appearance
            </Button>
          </div>

          {/* Full Settings Link */}
          <Button
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            onClick={handleOpenFullSettings}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Full Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
