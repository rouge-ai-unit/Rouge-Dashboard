"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Mail, Edit, Eye, Plus, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  category: string;
  isActive: boolean;
}

const DEFAULT_TEMPLATES = [
  {
    id: "welcome",
    name: "Welcome Email",
    subject: "Welcome to Rouge Dashboard - {{userName}}",
    category: "onboarding",
    variables: ["userName", "userEmail", "dashboardUrl"],
    htmlContent: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #2563eb;">Welcome to Rouge Dashboard!</h1>
  <p>Hi {{userName}},</p>
  <p>Your account has been approved and you now have access to the Rouge Dashboard.</p>
  <p><strong>Your Details:</strong></p>
  <ul>
    <li>Email: {{userEmail}}</li>
    <li>Role: {{userRole}}</li>
    <li>Unit: {{userUnit}}</li>
  </ul>
  <p>
    <a href="{{dashboardUrl}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Go to Dashboard
    </a>
  </p>
  <p>If you have any questions, feel free to reach out to our support team.</p>
  <p>Best regards,<br>The Rouge Team</p>
</div>`,
    textContent: `Welcome to Rouge Dashboard!

Hi {{userName}},

Your account has been approved and you now have access to the Rouge Dashboard.

Your Details:
- Email: {{userEmail}}
- Role: {{userRole}}
- Unit: {{userUnit}}

Visit your dashboard: {{dashboardUrl}}

If you have any questions, feel free to reach out to our support team.

Best regards,
The Rouge Team`,
    isActive: true,
  },
  {
    id: "approval",
    name: "Account Approved",
    subject: "Your Rouge Dashboard Account Has Been Approved",
    category: "approval",
    variables: ["userName", "userRole", "userUnit", "approvedBy"],
    htmlContent: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #10b981;">Account Approved! 🎉</h1>
  <p>Hi {{userName}},</p>
  <p>Great news! Your Rouge Dashboard account has been approved by {{approvedBy}}.</p>
  <p><strong>Account Details:</strong></p>
  <ul>
    <li>Role: {{userRole}}</li>
    <li>Unit: {{userUnit}}</li>
  </ul>
  <p>You can now access all the tools and features available to your role.</p>
  <p>
    <a href="{{dashboardUrl}}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Access Dashboard
    </a>
  </p>
  <p>Best regards,<br>The Rouge Team</p>
</div>`,
    textContent: `Account Approved! 🎉

Hi {{userName}},

Great news! Your Rouge Dashboard account has been approved by {{approvedBy}}.

Account Details:
- Role: {{userRole}}
- Unit: {{userUnit}}

You can now access all the tools and features available to your role.

Access your dashboard: {{dashboardUrl}}

Best regards,
The Rouge Team`,
    isActive: true,
  },
  {
    id: "rejection",
    name: "Account Rejected",
    subject: "Rouge Dashboard Account Application Update",
    category: "approval",
    variables: ["userName", "rejectionReason", "contactEmail"],
    htmlContent: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #ef4444;">Account Application Update</h1>
  <p>Hi {{userName}},</p>
  <p>Thank you for your interest in Rouge Dashboard. After careful review, we're unable to approve your account application at this time.</p>
  <p><strong>Reason:</strong> {{rejectionReason}}</p>
  <p>If you believe this is an error or would like to discuss this decision, please contact us at {{contactEmail}}.</p>
  <p>Best regards,<br>The Rouge Team</p>
</div>`,
    textContent: `Account Application Update

Hi {{userName}},

Thank you for your interest in Rouge Dashboard. After careful review, we're unable to approve your account application at this time.

Reason: {{rejectionReason}}

If you believe this is an error or would like to discuss this decision, please contact us at {{contactEmail}}.

Best regards,
The Rouge Team`,
    isActive: true,
  },
  {
    id: "tool_access_granted",
    name: "Tool Access Granted",
    subject: "Access Granted: {{toolName}}",
    category: "access",
    variables: ["userName", "toolName", "toolUrl"],
    htmlContent: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #10b981;">Access Granted! ✅</h1>
  <p>Hi {{userName}},</p>
  <p>Your request for access to <strong>{{toolName}}</strong> has been approved.</p>
  <p>You can now start using this tool.</p>
  <p>
    <a href="{{toolUrl}}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      Open {{toolName}}
    </a>
  </p>
  <p>Best regards,<br>The Rouge Team</p>
</div>`,
    textContent: `Access Granted! ✅

Hi {{userName}},

Your request for access to {{toolName}} has been approved.

You can now start using this tool: {{toolUrl}}

Best regards,
The Rouge Team`,
    isActive: true,
  },
  {
    id: "role_changed",
    name: "Role Changed",
    subject: "Your Role Has Been Updated",
    category: "account",
    variables: ["userName", "oldRole", "newRole", "changedBy"],
    htmlContent: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h1 style="color: #2563eb;">Role Update</h1>
  <p>Hi {{userName}},</p>
  <p>Your role in Rouge Dashboard has been updated by {{changedBy}}.</p>
  <p><strong>Previous Role:</strong> {{oldRole}}</p>
  <p><strong>New Role:</strong> {{newRole}}</p>
  <p>Your permissions and access have been updated accordingly.</p>
  <p>
    <a href="{{dashboardUrl}}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
      View Dashboard
    </a>
  </p>
  <p>Best regards,<br>The Rouge Team</p>
</div>`,
    textContent: `Role Update

Hi {{userName}},

Your role in Rouge Dashboard has been updated by {{changedBy}}.

Previous Role: {{oldRole}}
New Role: {{newRole}}

Your permissions and access have been updated accordingly.

View your dashboard: {{dashboardUrl}}

Best regards,
The Rouge Team`,
    isActive: true,
  },
];

export default function EmailTemplatesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>(DEFAULT_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setEditedTemplate({ ...template });
    setShowEditDialog(true);
  };

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setShowPreviewDialog(true);
  };

  const handleSave = () => {
    if (!editedTemplate) return;
    
    setTemplates(prev => 
      prev.map(t => t.id === editedTemplate.id ? editedTemplate : t)
    );
    
    toast.success("Template updated successfully");
    setShowEditDialog(false);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "onboarding": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "approval": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "access": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "account": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      default: return "bg-gray-500/20 text-gray-400 border-gray-500/30";
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
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/dashboard">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin Dashboard
          </Button>
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <Mail className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Email Templates</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Manage email templates for user notifications
        </p>
      </div>

      {/* Templates Grid */}
      <div className="grid gap-4">
        {templates.map((template) => (
          <Card key={template.id} className="bg-white dark:bg-gray-800">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CardTitle>{template.name}</CardTitle>
                    <Badge className={getCategoryColor(template.category)}>
                      {template.category}
                    </Badge>
                    {template.isActive && (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        Active
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="font-mono text-sm">
                    Subject: {template.subject}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handlePreview(template)}>
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(template)}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Variables:</span>
                {template.variables.map((variable) => (
                  <Badge key={variable} variant="secondary" className="font-mono text-xs">
                    {`{{${variable}}}`}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Email Template</DialogTitle>
            <DialogDescription>
              Customize the email template content and variables
            </DialogDescription>
          </DialogHeader>
          {editedTemplate && (
            <div className="space-y-4">
              <div>
                <Label>Template Name</Label>
                <Input
                  value={editedTemplate.name}
                  onChange={(e) => setEditedTemplate({ ...editedTemplate, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Subject Line</Label>
                <Input
                  value={editedTemplate.subject}
                  onChange={(e) => setEditedTemplate({ ...editedTemplate, subject: e.target.value })}
                />
              </div>
              <div>
                <Label>HTML Content</Label>
                <Textarea
                  value={editedTemplate.htmlContent}
                  onChange={(e) => setEditedTemplate({ ...editedTemplate, htmlContent: e.target.value })}
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <Label>Plain Text Content</Label>
                <Textarea
                  value={editedTemplate.textContent}
                  onChange={(e) => setEditedTemplate({ ...editedTemplate, textContent: e.target.value })}
                  rows={8}
                  className="font-mono text-sm"
                />
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Available Variables:</p>
                <div className="flex flex-wrap gap-2">
                  {editedTemplate.variables.map((variable) => (
                    <Badge key={variable} variant="secondary" className="font-mono">
                      {`{{${variable}}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Preview: {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>
              Preview of how the email will appear to recipients
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-sm font-medium mb-1">Subject:</p>
                <p className="font-mono">{selectedTemplate.subject}</p>
              </div>
              <div className="border rounded-lg p-6 bg-white dark:bg-gray-900">
                <div dangerouslySetInnerHTML={{ __html: selectedTemplate.htmlContent }} />
              </div>
              <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Plain Text Version:</p>
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {selectedTemplate.textContent}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowPreviewDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
