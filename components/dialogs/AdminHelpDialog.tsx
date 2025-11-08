"use client";
import React from "react";
import Link from "next/link";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  Users, 
  Activity, 
  Settings, 
  Lock,
  UserCheck,
  FileText,
  Mail,
  AlertTriangle,
  Database,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Key,
  Bell,
  Zap
} from "lucide-react";

export type AdminHelpDialogProps = { open: boolean; onOpenChangeAction: (open: boolean) => void };

export default function AdminHelpDialog({ open, onOpenChangeAction }: AdminHelpDialogProps) {
  // Defensive: ensure no lingering overlay blocks clicks after close
  if (!open) {
    try {
      const tidy = () => {
        document.querySelectorAll<HTMLElement>('[data-slot="dialog-overlay"], [data-slot="drawer-overlay"], [data-state="closed"][data-slot="dialog-content"], [data-state="closed"][data-slot="drawer-content"]').forEach((el) => {
          el.style.pointerEvents = "none";
        });
      };
      tidy();
      setTimeout(tidy, 200);
    } catch {}
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="bg-gray-900/95 backdrop-blur-md text-gray-100 border-gray-700/50 sm:max-w-5xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            Admin Control Panel - Help & Documentation
          </DialogTitle>
          <DialogDescription className="text-lg text-gray-300">
            Comprehensive guide for system administrators and platform management
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-1 space-y-6 scrollbar-thin scrollbar-track-gray-800 scrollbar-thumb-gray-600 hover:scrollbar-thumb-gray-500">
          
          {/* Admin Overview */}
          <Card className="bg-gradient-to-br from-red-900/30 to-orange-900/30 backdrop-blur-sm border-red-500/30 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Shield className="w-6 h-6 text-red-400" />
                Admin Panel Overview
                <Badge variant="secondary" className="bg-red-600/20 text-red-400 border-red-500/30">Administrator</Badge>
              </CardTitle>
              <CardDescription className="text-gray-300">
                Centralized control panel for user management, security monitoring, and system administration
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-gray-300 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-red-400 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    User Management
                  </h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Approve/reject user registrations</li>
                    <li>• Manage user roles and permissions</li>
                    <li>• View user activity and audit logs</li>
                    <li>• Handle tool access requests</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-orange-400 mb-2 flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Security & Monitoring
                  </h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Monitor failed login attempts</li>
                    <li>• Track suspicious activity</li>
                    <li>• Manage security alerts</li>
                    <li>• Review system access logs</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Features */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Activity className="w-6 h-6 text-blue-400" />
                Admin Features & Tools
              </CardTitle>
              <CardDescription>Complete guide to administrative functions</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="user-approvals" className="border-gray-700/50">
                  <AccordionTrigger className="text-red-400 hover:text-red-300">
                    <div className="flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      User Approvals
                      <Badge variant="outline" className="border-yellow-500/30 text-yellow-400">Critical</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Review and approve new user registration requests</p>
                    <p><strong>Features:</strong> Bulk approve/reject, user details review, email notifications, approval history</p>
                    <p><strong>Usage:</strong> Navigate to Approvals → Review user details → Approve or reject with reason → User receives email notification</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/admin/approvals</code></p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="user-management" className="border-gray-700/50">
                  <AccordionTrigger className="text-red-400 hover:text-red-300">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      User Management
                      <Badge variant="outline" className="border-blue-500/30 text-blue-400">Core</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Manage all registered users, roles, and permissions</p>
                    <p><strong>Features:</strong> User search, role assignment (Admin/Leader/Co-Leader/Member), unit management, user deactivation, export user data</p>
                    <p><strong>Roles:</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>Admin:</strong> Full system access, user management, security monitoring</li>
                      <li><strong>Leader:</strong> Unit management, team oversight, tool access approval</li>
                      <li><strong>Co-Leader:</strong> Assist leaders, limited management capabilities</li>
                      <li><strong>Member:</strong> Standard user access to approved tools</li>
                    </ul>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/admin/users</code></p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="tool-requests" className="border-gray-700/50">
                  <AccordionTrigger className="text-red-400 hover:text-red-300">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Tool Access Requests
                      <Badge variant="outline" className="border-indigo-500/30 text-indigo-400">Workflow</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Review and approve user requests for tool access</p>
                    <p><strong>Features:</strong> Request queue, approval workflow, access granting, email notifications</p>
                    <p><strong>Usage:</strong> View pending requests → Review justification → Approve/deny access → User notified via email</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/admin/tool-requests</code></p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="ai-tools-requests" className="border-gray-700/50">
                  <AccordionTrigger className="text-red-400 hover:text-red-300">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      AI Tools Development Requests
                      <Badge variant="outline" className="border-purple-500/30 text-purple-400">Development</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Manage requests for new AI tools and features</p>
                    <p><strong>Features:</strong> Ticket system, priority management, status tracking, team assignment</p>
                    <p><strong>Usage:</strong> Review requests → Assign priority → Update status → Track development progress</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/admin/ai-tools-requests</code></p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="security" className="border-gray-700/50">
                  <AccordionTrigger className="text-red-400 hover:text-red-300">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Security Dashboard
                      <Badge variant="outline" className="border-red-500/30 text-red-400">Security</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Monitor security events and failed login attempts</p>
                    <p><strong>Features:</strong> Failed login tracking, IP monitoring, suspicious activity alerts, account lockout management</p>
                    <p><strong>Metrics:</strong> Total failed logins, unique IPs, suspicious activity count, locked accounts</p>
                    <p><strong>Usage:</strong> Monitor dashboard → Investigate suspicious IPs → Review failed attempts → Take action on threats</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/admin/security</code></p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="activity-logs" className="border-gray-700/50">
                  <AccordionTrigger className="text-red-400 hover:text-red-300">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Activity Logs
                      <Badge variant="outline" className="border-green-500/30 text-green-400">Audit</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Comprehensive audit trail of all admin actions</p>
                    <p><strong>Features:</strong> Action logging, user tracking, timestamp records, export capabilities</p>
                    <p><strong>Logged Actions:</strong> User approvals, role changes, permission updates, security events</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/admin/activity-logs</code></p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="analytics" className="border-gray-700/50">
                  <AccordionTrigger className="text-red-400 hover:text-red-300">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Analytics Dashboard
                      <Badge variant="outline" className="border-cyan-500/30 text-cyan-400">Insights</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Platform usage statistics and growth metrics</p>
                    <p><strong>Metrics:</strong> User growth, active users, tool usage, login activity, geographic distribution</p>
                    <p><strong>Features:</strong> Real-time stats, trend analysis, export reports, custom date ranges</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/admin/analytics</code></p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="notifications" className="border-gray-700/50">
                  <AccordionTrigger className="text-red-400 hover:text-red-300">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Notification Center
                      <Badge variant="outline" className="border-yellow-500/30 text-yellow-400">Communication</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Send system-wide notifications to users</p>
                    <p><strong>Features:</strong> Broadcast messages, targeted notifications, email integration, notification history</p>
                    <p><strong>Usage:</strong> Compose message → Select recipients → Choose delivery method → Send notification</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/admin/notifications</code></p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="email-templates" className="border-gray-700/50">
                  <AccordionTrigger className="text-red-400 hover:text-red-300">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Templates
                      <Badge variant="outline" className="border-blue-500/30 text-blue-400">Configuration</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Manage email templates for automated notifications</p>
                    <p><strong>Templates:</strong> Welcome emails, approval notifications, rejection notices, role changes, tool access grants</p>
                    <p><strong>Features:</strong> Template editor, variable support, preview mode, version control</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/admin/email-templates</code></p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="units" className="border-gray-700/50">
                  <AccordionTrigger className="text-red-400 hover:text-red-300">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Units & Departments
                      <Badge variant="outline" className="border-purple-500/30 text-purple-400">Organization</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Manage organizational units and departments</p>
                    <p><strong>Features:</strong> Create/edit units, assign leaders, manage members, unit statistics</p>
                    <p><strong>Usage:</strong> Create unit → Assign leader → Add members → Configure permissions</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/admin/units</code></p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="permissions" className="border-gray-700/50">
                  <AccordionTrigger className="text-red-400 hover:text-red-300">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4" />
                      Role Permissions
                      <Badge variant="outline" className="border-orange-500/30 text-orange-400">Access Control</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Configure role-based access control (RBAC)</p>
                    <p><strong>Features:</strong> Permission matrix, role templates, audit trail, bulk updates</p>
                    <p><strong>Usage:</strong> Select role → Configure permissions → Review changes → Apply updates</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/admin/permissions</code></p>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="support" className="border-gray-700/50">
                  <AccordionTrigger className="text-red-400 hover:text-red-300">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Support & Contact Requests
                      <Badge variant="outline" className="border-green-500/30 text-green-400">Support</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-300 space-y-2">
                    <p><strong>Purpose:</strong> Manage user support tickets and contact requests</p>
                    <p><strong>Features:</strong> Ticket queue, priority management, response tracking, resolution status</p>
                    <p><strong>Usage:</strong> View tickets → Assign priority → Respond to user → Mark as resolved</p>
                    <p><strong>Route:</strong> <code className="bg-gray-700/50 px-2 py-1 rounded">/admin/support</code></p>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          {/* Best Practices */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                Admin Best Practices
              </CardTitle>
              <CardDescription>Guidelines for effective platform administration</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-gray-300 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold text-green-400 mb-2">✅ Do</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Review user approvals within 24 hours</li>
                    <li>• Monitor security dashboard daily</li>
                    <li>• Document major changes in activity logs</li>
                    <li>• Respond to support tickets promptly</li>
                    <li>• Keep email templates up to date</li>
                    <li>• Regularly review user permissions</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-red-400 mb-2">❌ Don&apos;t</h4>
                  <ul className="space-y-1 text-xs">
                    <li>• Grant admin access without approval</li>
                    <li>• Ignore security alerts or failed logins</li>
                    <li>• Delete users without proper documentation</li>
                    <li>• Share admin credentials</li>
                    <li>• Make bulk changes without backup</li>
                    <li>• Bypass approval workflows</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-gray-800/50 backdrop-blur-sm border-gray-700/50 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-400" />
                Quick Actions
              </CardTitle>
              <CardDescription>Common administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <Link className="flex items-center gap-2 text-red-400 hover:text-red-300 hover:underline transition-colors p-2 rounded-lg hover:bg-gray-700/30" href="/admin/approvals">
                <Clock className="w-4 h-4"/> 
                Pending Approvals
              </Link>
              <Link className="flex items-center gap-2 text-blue-400 hover:text-blue-300 hover:underline transition-colors p-2 rounded-lg hover:bg-gray-700/30" href="/admin/users">
                <Users className="w-4 h-4"/> 
                Manage Users
              </Link>
              <Link className="flex items-center gap-2 text-orange-400 hover:text-orange-300 hover:underline transition-colors p-2 rounded-lg hover:bg-gray-700/30" href="/admin/security">
                <AlertTriangle className="w-4 h-4"/> 
                Security Dashboard
              </Link>
              <Link className="flex items-center gap-2 text-green-400 hover:text-green-300 hover:underline transition-colors p-2 rounded-lg hover:bg-gray-700/30" href="/admin/activity-logs">
                <Activity className="w-4 h-4"/> 
                Activity Logs
              </Link>
              <Link className="flex items-center gap-2 text-purple-400 hover:text-purple-300 hover:underline transition-colors p-2 rounded-lg hover:bg-gray-700/30" href="/admin/analytics">
                <BarChart3 className="w-4 h-4"/> 
                Analytics
              </Link>
              <Link className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 hover:underline transition-colors p-2 rounded-lg hover:bg-gray-700/30" href="/admin/settings">
                <Settings className="w-4 h-4"/> 
                Admin Settings
              </Link>
            </CardContent>
          </Card>
        </div>
        <DialogFooter className="flex-shrink-0 mt-4 pt-4 border-t border-gray-700/50">
          <button 
            onClick={() => onOpenChangeAction(false)} 
            className="w-full px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-700 hover:to-orange-700 transition-all duration-200 font-medium shadow-lg"
          >
            Close
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
