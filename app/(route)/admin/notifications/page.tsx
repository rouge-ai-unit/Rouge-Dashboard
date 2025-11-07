"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Bell, Send, Users, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";

export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    recipientType: "all_users",
    specificUserId: "",
    notificationType: "system_announcement",
    priority: "normal",
    title: "",
    message: "",
    actionUrl: "",
    actionLabel: "",
  });

  // Protect admin route
  useEffect(() => {
    if (status === "authenticated") {
      const userRole = (session?.user as any)?.role;
      if (userRole !== "admin") {
        router.push("/home");
      }
    } else if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, session, router]);

  const handleSendNotification = async () => {
    if (!formData.title || !formData.message) {
      toast.error("Please fill in title and message");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || "Notification sent successfully");
        // Reset form
        setFormData({
          recipientType: "all_users",
          specificUserId: "",
          notificationType: "system_announcement",
          priority: "normal",
          title: "",
          message: "",
          actionUrl: "",
          actionLabel: "",
        });
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to send notification");
      }
    } catch (error) {
      console.error("Error sending notification:", error);
      toast.error("Error sending notification");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/dashboard">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin Dashboard
          </Button>
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <Bell className="w-8 h-8 text-purple-600" />
          <h1 className="text-3xl font-bold">Notification Center</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Send notifications to users and manage notification templates
        </p>
      </div>

      {/* Send Notification Form */}
      <Card className="bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Send Notification
          </CardTitle>
          <CardDescription>
            Create and send notifications to users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recipient Type */}
          <div>
            <Label>Recipients</Label>
            <Select 
              value={formData.recipientType} 
              onValueChange={(value) => setFormData({ ...formData, recipientType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_users">All Users</SelectItem>
                <SelectItem value="all_admins">All Admins</SelectItem>
                <SelectItem value="all_leaders">All Leaders</SelectItem>
                <SelectItem value="all_members">All Members</SelectItem>
                <SelectItem value="specific_user">Specific User</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Specific User ID (if selected) */}
          {formData.recipientType === "specific_user" && (
            <div>
              <Label>User Email or ID</Label>
              <Input
                value={formData.specificUserId}
                onChange={(e) => setFormData({ ...formData, specificUserId: e.target.value })}
                placeholder="Enter user email or ID"
              />
            </div>
          )}

          {/* Notification Type */}
          <div>
            <Label>Notification Type</Label>
            <Select 
              value={formData.notificationType} 
              onValueChange={(value) => setFormData({ ...formData, notificationType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system_announcement">System Announcement</SelectItem>
                <SelectItem value="feature_update">Feature Update</SelectItem>
                <SelectItem value="maintenance">Maintenance Notice</SelectItem>
                <SelectItem value="security_alert">Security Alert</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div>
            <Label>Priority</Label>
            <Select 
              value={formData.priority} 
              onValueChange={(value) => setFormData({ ...formData, priority: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div>
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Notification title"
              maxLength={255}
            />
          </div>

          {/* Message */}
          <div>
            <Label>Message *</Label>
            <Textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Notification message"
              rows={4}
            />
          </div>

          {/* Action URL (Optional) */}
          <div>
            <Label>Action URL (Optional)</Label>
            <Input
              value={formData.actionUrl}
              onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
              placeholder="/path/to/action"
            />
          </div>

          {/* Action Label (Optional) */}
          {formData.actionUrl && (
            <div>
              <Label>Action Button Label</Label>
              <Input
                value={formData.actionLabel}
                onChange={(e) => setFormData({ ...formData, actionLabel: e.target.value })}
                placeholder="View Details"
              />
            </div>
          )}

          {/* Send Button */}
          <Button 
            onClick={handleSendNotification} 
            disabled={loading || !formData.title || !formData.message}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Send className="w-4 h-4 mr-2" />
            )}
            Send Notification
          </Button>
        </CardContent>
      </Card>

      {/* Quick Templates */}
      <Card className="mt-6 bg-white dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Quick Templates
          </CardTitle>
          <CardDescription>
            Pre-configured notification templates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => setFormData({
                ...formData,
                notificationType: "system_announcement",
                priority: "high",
                title: "System Maintenance Scheduled",
                message: "We will be performing scheduled maintenance on [DATE] from [TIME] to [TIME]. The platform may be temporarily unavailable during this period.",
              })}
            >
              Maintenance Notice Template
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => setFormData({
                ...formData,
                notificationType: "feature_update",
                priority: "normal",
                title: "New Feature Available",
                message: "We're excited to announce a new feature: [FEATURE NAME]. Check it out now!",
                actionLabel: "Learn More",
              })}
            >
              Feature Update Template
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => setFormData({
                ...formData,
                notificationType: "security_alert",
                priority: "urgent",
                title: "Security Alert",
                message: "We detected unusual activity on your account. Please review your recent activity and update your password if necessary.",
                actionUrl: "/settings/security",
                actionLabel: "Review Security",
              })}
            >
              Security Alert Template
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
