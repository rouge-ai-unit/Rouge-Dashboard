"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shield, ArrowLeft, Loader2, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Permission {
  id: string;
  role: string;
  resource: string;
  action: string;
  allowed: boolean;
}

interface ToolPermission {
  toolName: string;
  toolPath: string;
  admin: boolean;
  leader: boolean;
  coLeader: boolean;
  member: boolean;
}

export default function PermissionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [toolPermissions, setToolPermissions] = useState<ToolPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Protect admin route
  useEffect(() => {
    if (status === "authenticated") {
      const userRole = (session?.user as any)?.role;
      if (userRole !== "admin") {
        router.push("/home");
      } else {
        fetchPermissions();
      }
    } else if (status === "unauthenticated") {
      router.push("/signin");
    }
  }, [status, session, router]);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/permissions");
      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions || []);
        
        // Build tool permissions matrix
        const tools = [
          { name: "AI Tools Request Form", path: "/tools/ai-tools-request-form" },
          { name: "Work Tracker", path: "/tools/work-tracker" },
          { name: "AI News Daily", path: "/tools/ai-news-daily" },
          { name: "Agritech Startup Seeker", path: "/tools/startup-seeker" },
          { name: "AgTech Event Finder", path: "/agtech-events" },
          { name: "Agritech Universities", path: "/tools/agritech-universities" },
          { name: "Sentiment Analyzer", path: "/tools/sentiment-analyzer" },
          { name: "Content Idea Automation", path: "/tools/content-idea-automation" },
          { name: "Cold Connect Automator", path: "/tools/cold-connect-automator" },
          { name: "AI Outreach Agent", path: "/tools/ai-outreach-agent" },
          { name: "Contact Us", path: "/tools/contact" },
        ];
        
        const toolMatrix = tools.map(tool => {
          const adminPerm = data.permissions.find((p: Permission) => 
            p.role === "admin" && p.resource === tool.path && p.action === "execute"
          );
          const leaderPerm = data.permissions.find((p: Permission) => 
            p.role === "leader" && p.resource === tool.path && p.action === "execute"
          );
          const coLeaderPerm = data.permissions.find((p: Permission) => 
            p.role === "co-leader" && p.resource === tool.path && p.action === "execute"
          );
          const memberPerm = data.permissions.find((p: Permission) => 
            p.role === "member" && p.resource === tool.path && p.action === "execute"
          );
          
          return {
            toolName: tool.name,
            toolPath: tool.path,
            admin: adminPerm?.allowed ?? true,
            leader: leaderPerm?.allowed ?? true,
            coLeader: coLeaderPerm?.allowed ?? true,
            member: memberPerm?.allowed ?? false,
          };
        });
        
        setToolPermissions(toolMatrix);
      } else {
        toast.error("Failed to fetch permissions");
      }
    } catch (error) {
      console.error("Error fetching permissions:", error);
      toast.error("Error loading permissions");
    } finally {
      setLoading(false);
    }
  };

  const toggleToolPermission = (toolPath: string, role: string) => {
    setToolPermissions(prev => prev.map(tool => {
      if (tool.toolPath === toolPath) {
        return {
          ...tool,
          [role]: !tool[role as keyof ToolPermission]
        };
      }
      return tool;
    }));
  };

  const savePermissions = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/permissions/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toolPermissions
        }),
      });

      if (response.ok) {
        toast.success("Permissions updated successfully");
        fetchPermissions();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update permissions");
      }
    } catch (error) {
      console.error("Error saving permissions:", error);
      toast.error("Error saving permissions");
    } finally {
      setSaving(false);
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

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/dashboard">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin Dashboard
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8 text-green-600" />
              <h1 className="text-3xl font-bold">Role & Permission Manager</h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Configure tool access and permissions for each role
            </p>
          </div>
          <Link href="/admin/permissions/audit">
            <Button variant="outline">
              <Shield className="w-4 h-4 mr-2" />
              View Audit Trail
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="tools" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tools">Tool Access Control</TabsTrigger>
          <TabsTrigger value="features">Feature Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="tools" className="mt-6">
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tool Access Matrix</CardTitle>
                  <CardDescription>
                    Control which roles can access each tool
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button onClick={fetchPermissions} variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  <Button onClick={savePermissions} disabled={saving} size="sm">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-700">
                      <TableHead className="w-[300px] text-white">Tool Name</TableHead>
                      <TableHead className="text-center">
                        <Badge className={getRoleBadgeColor("admin")}>Admin</Badge>
                      </TableHead>
                      <TableHead className="text-center">
                        <Badge className={getRoleBadgeColor("leader")}>Leader</Badge>
                      </TableHead>
                      <TableHead className="text-center">
                        <Badge className={getRoleBadgeColor("co-leader")}>Co-Leader</Badge>
                      </TableHead>
                      <TableHead className="text-center">
                        <Badge className={getRoleBadgeColor("member")}>Member</Badge>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {toolPermissions.map((tool) => (
                      <TableRow key={tool.toolPath} className="border-b border-gray-700 hover:bg-gray-700/30">
                        <TableCell className="font-medium text-white">{tool.toolName}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <input
                              type="checkbox"
                              checked={tool.admin}
                              onChange={() => toggleToolPermission(tool.toolPath, "admin")}
                              className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <input
                              type="checkbox"
                              checked={tool.leader}
                              onChange={() => toggleToolPermission(tool.toolPath, "leader")}
                              className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <input
                              type="checkbox"
                              checked={tool.coLeader}
                              onChange={() => toggleToolPermission(tool.toolPath, "coLeader")}
                              className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-2 focus:ring-purple-500 cursor-pointer"
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            <input
                              type="checkbox"
                              checked={tool.member}
                              onChange={() => toggleToolPermission(tool.toolPath, "member")}
                              className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-green-600 focus:ring-2 focus:ring-green-500 cursor-pointer"
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="mt-6">
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle>Feature Permissions</CardTitle>
              <CardDescription>
                Manage permissions for platform features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <h3 className="font-semibold mb-2 text-white">User Management</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    Control who can manage users, roles, and approvals
                  </p>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <span className="text-sm text-white">Admin</span>
                      <input type="checkbox" checked={true} disabled className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 opacity-50" />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <span className="text-sm text-white">Leader</span>
                      <input type="checkbox" checked={false} disabled className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 opacity-50" />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <span className="text-sm text-white">Co-Leader</span>
                      <input type="checkbox" checked={false} disabled className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 opacity-50" />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <span className="text-sm text-white">Member</span>
                      <input type="checkbox" checked={false} disabled className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 opacity-50" />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <h3 className="font-semibold mb-2 text-white">Analytics Access</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    View platform analytics and usage statistics
                  </p>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <span className="text-sm text-white">Admin</span>
                      <input type="checkbox" checked={true} disabled className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-purple-600 opacity-50" />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <span className="text-sm text-white">Leader</span>
                      <input type="checkbox" checked={true} disabled className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-purple-600 opacity-50" />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <span className="text-sm text-white">Co-Leader</span>
                      <input type="checkbox" checked={true} disabled className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-purple-600 opacity-50" />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <span className="text-sm text-white">Member</span>
                      <input type="checkbox" checked={false} disabled className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-purple-600 opacity-50" />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <h3 className="font-semibold mb-2 text-white">Settings Management</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    Modify platform settings and configurations
                  </p>
                  <div className="grid grid-cols-4 gap-4">
                    <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <span className="text-sm text-white">Admin</span>
                      <input type="checkbox" checked={true} disabled className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-green-600 opacity-50" />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <span className="text-sm text-white">Leader</span>
                      <input type="checkbox" checked={false} disabled className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-green-600 opacity-50" />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <span className="text-sm text-white">Co-Leader</span>
                      <input type="checkbox" checked={false} disabled className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-green-600 opacity-50" />
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <span className="text-sm text-white">Member</span>
                      <input type="checkbox" checked={false} disabled className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-green-600 opacity-50" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
