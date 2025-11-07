"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, User, Mail, Shield, Calendar, Activity, Monitor, History, Wrench, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import Link from "next/link";

interface UserDetails {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role: string;
  unit: string;
  status: string;
  isApproved: boolean;
  createdAt: string;
  lastLoginAt: string;
  lastLoginIp: string;
  approvedBy: string;
  approvedAt: string;
}

interface Session {
  id: string;
  ipAddress: string;
  device: string;
  browser: string;
  os: string;
  isActive: boolean;
  createdAt: string;
  lastActivityAt: string;
  expiresAt: string;
}

interface RoleChange {
  id: string;
  oldRole: string;
  newRole: string;
  oldUnit: string;
  newUnit: string;
  reason: string;
  createdAt: string;
  changedByName: string;
}

interface AdminAction {
  id: string;
  action: string;
  targetResource: string;
  oldValue: any;
  newValue: any;
  reason: string;
  createdAt: string;
  adminName: string;
}

interface ToolRequest {
  id: string;
  toolName: string;
  toolPath: string;
  justification: string;
  status: string;
  createdAt: string;
}

export default function UserProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [user, setUser] = useState<UserDetails | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [roleHistory, setRoleHistory] = useState<RoleChange[]>([]);
  const [adminActions, setAdminActions] = useState<AdminAction[]>([]);
  const [toolRequests, setToolRequests] = useState<ToolRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      const userRole = (session?.user as any)?.role;
      if (userRole !== "admin") {
        router.push("/home");
      } else {
        fetchUserDetails();
      }
    } else if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, session, router, userId]);

  const fetchUserDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setSessions(data.sessions || []);
        setRoleHistory(data.roleHistory || []);
        setAdminActions(data.adminActions || []);
        setToolRequests(data.toolRequests || []);
      } else {
        toast.error("Failed to fetch user details");
        router.push("/admin/users");
      }
    } catch (error) {
      console.error("Error fetching user details:", error);
      toast.error("Error loading user details");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = (sessionId: string) => {
    setSessionToRevoke(sessionId);
    setShowRevokeDialog(true);
  };

  const handleRevokeAllSessions = () => {
    setSessionToRevoke(null);
    setShowRevokeDialog(true);
  };

  const confirmRevokeSession = async () => {
    setProcessing(true);
    try {
      const url = sessionToRevoke
        ? `/api/admin/users/${userId}/sessions?sessionId=${sessionToRevoke}`
        : `/api/admin/users/${userId}/sessions`;

      const response = await fetch(url, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(sessionToRevoke ? "Session revoked successfully" : "All sessions revoked successfully");
        setShowRevokeDialog(false);
        fetchUserDetails();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to revoke session");
      }
    } catch (error) {
      console.error("Error revoking session:", error);
      toast.error("Error revoking session");
    } finally {
      setProcessing(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "leader": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "co-leader": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "member": return "bg-green-500/20 text-green-400 border-green-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "pending": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "suspended": return "bg-red-500/20 text-red-400 border-red-500/30";
      case "locked": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">User not found</p>
          <Link href="/admin/users">
            <Button>Back to Users</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/users">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users
          </Button>
        </Link>
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-2xl">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{user.displayName}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={`capitalize ${getRoleBadgeColor(user.role)}`}>
                  {user.role}
                </Badge>
                <Badge className={`capitalize ${getStatusBadgeColor(user.status)}`}>
                  {user.status}
                </Badge>
                {user.unit && <Badge variant="outline">{user.unit}</Badge>}
              </div>
            </div>
          </div>
          
          <Link href={`/admin/users`}>
            <Button>Edit User</Button>
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Joined</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Date(user.createdAt).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Last Login</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : "Never"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.filter(s => s.isActive).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Tool Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {toolRequests.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sessions">
            <Monitor className="w-4 h-4 mr-2" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-2" />
            Role History
          </TabsTrigger>
          <TabsTrigger value="actions">
            <Activity className="w-4 h-4 mr-2" />
            Admin Actions
          </TabsTrigger>
          <TabsTrigger value="tools">
            <Wrench className="w-4 h-4 mr-2" />
            Tool Requests
          </TabsTrigger>
        </TabsList>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Active Sessions</CardTitle>
                  <CardDescription>Manage user sessions and security</CardDescription>
                </div>
                {sessions.filter(s => s.isActive).length > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRevokeAllSessions}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Revoke All Sessions
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No sessions found</p>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Monitor className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{session.device || "Unknown Device"}</span>
                          {session.isActive ? (
                            <Badge className="bg-green-500/20 text-green-400">Active</Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <p>Browser: {session.browser || "Unknown"} • OS: {session.os || "Unknown"}</p>
                          <p>IP: {session.ipAddress || "Unknown"}</p>
                          <p>Last Activity: {new Date(session.lastActivityAt).toLocaleString()}</p>
                          <p>Expires: {new Date(session.expiresAt).toLocaleString()}</p>
                        </div>
                      </div>
                      {session.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevokeSession(session.id)}
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Role History Tab */}
        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Role Change History</CardTitle>
              <CardDescription>Track all role and unit changes</CardDescription>
            </CardHeader>
            <CardContent>
              {roleHistory.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No role changes found</p>
              ) : (
                <div className="space-y-4">
                  {roleHistory.map((change) => (
                    <div key={change.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={getRoleBadgeColor(change.oldRole)}>
                            {change.oldRole}
                          </Badge>
                          <span className="text-gray-400">→</span>
                          <Badge className={getRoleBadgeColor(change.newRole)}>
                            {change.newRole}
                          </Badge>
                        </div>
                        <span className="text-sm text-gray-500">
                          {new Date(change.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {(change.oldUnit || change.newUnit) && (
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            Unit: {change.oldUnit || "None"} → {change.newUnit || "None"}
                          </span>
                        </div>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Changed by: {change.changedByName}
                      </p>
                      {change.reason && (
                        <p className="text-sm text-gray-500 mt-2">Reason: {change.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Admin Actions Tab */}
        <TabsContent value="actions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Admin Actions</CardTitle>
              <CardDescription>All administrative actions performed on this user</CardDescription>
            </CardHeader>
            <CardContent>
              {adminActions.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No admin actions found</p>
              ) : (
                <div className="space-y-4">
                  {adminActions.map((action) => (
                    <div key={action.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize">
                          {action.action.replace(/_/g, " ")}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(action.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        By: {action.adminName}
                      </p>
                      {action.reason && (
                        <p className="text-sm text-gray-500">Reason: {action.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tool Requests Tab */}
        <TabsContent value="tools" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Tool Access Requests</CardTitle>
              <CardDescription>History of tool access requests</CardDescription>
            </CardHeader>
            <CardContent>
              {toolRequests.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No tool requests found</p>
              ) : (
                <div className="space-y-4">
                  {toolRequests.map((request) => (
                    <div key={request.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{request.toolName}</span>
                        <Badge
                          className={
                            request.status === "approved"
                              ? "bg-green-500/20 text-green-400"
                              : request.status === "rejected"
                              ? "bg-red-500/20 text-red-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }
                        >
                          {request.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {request.justification}
                      </p>
                      <p className="text-sm text-gray-500">
                        Requested: {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Revoke Session Dialog */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Session</DialogTitle>
            <DialogDescription>
              {sessionToRevoke
                ? "Are you sure you want to revoke this session? The user will be logged out from this device."
                : "Are you sure you want to revoke all sessions? The user will be logged out from all devices."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)} disabled={processing}>
              Cancel
            </Button>
            <Button onClick={confirmRevokeSession} disabled={processing} variant="destructive">
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
              Revoke {sessionToRevoke ? "Session" : "All Sessions"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
