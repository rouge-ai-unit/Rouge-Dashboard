"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Save,
  Eye,
  EyeOff,
  ArrowLeft,
  Plus,
  X,
  Copy,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Settings,
  Palette,
  Code,
  FileText,
  Sparkles,
  Target,
  Users,
  Mail,
  Zap,
  Star,
  Tag,
  Calendar,
  BarChart3,
  TrendingUp,
  Clock,
  ThumbsUp,
  Award,
  Wand2
} from 'lucide-react';
import { Template } from '@/lib/cold-outreach/templates';
import { formatDistanceToNow } from 'date-fns';

interface TemplateWithMetadata extends Template {
  category?: string;
  tags?: string[];
  usageCount?: number;
  lastUsed?: Date;
  performance?: {
    openRate?: number;
    clickRate?: number;
    replyRate?: number;
    conversionRate?: number;
  };
  isFavorite?: boolean;
  isPublic?: boolean;
}

interface Variable {
  name: string;
  description: string;
  example: string;
}

interface TemplateFormData {
  name: string;
  subject: string;
  content: string;
  category: string;
  tags: string[];
  isFavorite?: boolean;
  isPublic?: boolean;
}

const TEMPLATE_VARIABLES: Variable[] = [
  { name: '{{recipient.name}}', description: 'Recipient full name', example: 'John Doe' },
  { name: '{{recipient.firstName}}', description: 'Recipient first name', example: 'John' },
  { name: '{{recipient.lastName}}', description: 'Recipient last name', example: 'Doe' },
  { name: '{{recipient.email}}', description: 'Recipient email', example: 'john@company.com' },
  { name: '{{recipient.company}}', description: 'Recipient company', example: 'Tech Corp' },
  { name: '{{recipient.title}}', description: 'Recipient job title', example: 'CEO' },
  { name: '{{sender.name}}', description: 'Your full name', example: 'Jane Smith' },
  { name: '{{sender.firstName}}', description: 'Your first name', example: 'Jane' },
  { name: '{{sender.company}}', description: 'Your company', example: 'Sales Pro' },
  { name: '{{sender.email}}', description: 'Your email', example: 'jane@salespro.com' },
  { name: '{{sender.phone}}', description: 'Your phone', example: '+1 (555) 123-4567' },
  { name: '{{company.name}}', description: 'Target company name', example: 'Acme Inc' },
  { name: '{{company.industry}}', description: 'Target company industry', example: 'Technology' },
  { name: '{{company.size}}', description: 'Target company size', example: '100-500 employees' },
  { name: '{{personalization.product}}', description: 'Relevant product/service', example: 'our analytics platform' },
  { name: '{{personalization.painPoint}}', description: 'Company pain point', example: 'inefficient reporting' },
  { name: '{{personalization.benefit}}', description: 'Specific benefit', example: 'save 20 hours per week' },
];

const PREBUILT_TEMPLATES = [
  {
    name: 'Initial Outreach - SaaS',
    subject: 'Streamlining {{company.name}} Operations with Our Platform',
    content: `Hi {{recipient.firstName}},

I hope this email finds you well. I'm {{sender.firstName}} from {{sender.company}}, and I came across {{company.name}} while researching innovative companies in the {{company.industry}} space.

I noticed that many companies in your industry are struggling with {{personalization.painPoint}}. Our platform helps teams like yours {{personalization.benefit}} through our advanced automation and analytics features.

Would you be open to a quick 15-minute call next week to discuss how we might help {{company.name}} achieve similar results?

Best regards,
{{sender.name}}
{{sender.company}}
{{sender.email}}
{{sender.phone}}`,
    category: 'SaaS',
    tags: ['initial', 'automation', 'analytics']
  },
  {
    name: 'Follow-up - Networking',
    subject: 'Following up on our conversation about {{company.name}}',
    content: `Hi {{recipient.firstName}},

I wanted to follow up on my previous email about how our solutions could benefit {{company.name}}. I understand you're busy, but I truly believe our {{personalization.product}} could help address the {{personalization.painPoint}} challenge your team is facing.

Have you had a chance to discuss this with your team? I'd love to share some case studies from similar companies that have seen {{personalization.benefit}}.

Looking forward to your thoughts.

Best,
{{sender.name}}`,
    category: 'Follow-up',
    tags: ['follow-up', 'networking', 'case-studies']
  },
  {
    name: 'Value Proposition - B2B',
    subject: 'How {{company.name}} Can Scale with Our Enterprise Solution',
    content: `Dear {{recipient.firstName}},

As {{company.name}} continues to grow in the competitive {{company.industry}} landscape, I wanted to share how our enterprise solution has helped similar companies scale efficiently.

Our platform provides:
• Advanced analytics and reporting
• Automated workflow optimization
• Real-time collaboration tools
• Enterprise-grade security

Companies using our solution typically see {{personalization.benefit}} within the first 90 days.

Would you be interested in learning more about how this could work for {{company.name}}?

Warm regards,
{{sender.name}}
{{sender.company}}`,
    category: 'B2B',
    tags: ['enterprise', 'scaling', 'value-proposition']
  }
];

const TEMPLATE_CATEGORIES = [
  'General',
  'SaaS',
  'B2B',
  'Follow-up',
  'Networking',
  'Enterprise',
  'Cold Outreach',
  'Warm Outreach',
  'Product Launch',
  'Partnership',
  'Event Invitation',
  'Newsletter',
  'Case Study',
  'Testimonial Request'
];

const PERSONALIZATION_VARIABLES = [
  { key: '{{recipient.name}}', description: 'Recipient\'s full name' },
  { key: '{{recipient.firstName}}', description: 'Recipient\'s first name' },
  { key: '{{recipient.lastName}}', description: 'Recipient\'s last name' },
  { key: '{{recipient.company}}', description: 'Recipient\'s company name' },
  { key: '{{recipient.role}}', description: 'Recipient\'s job title' },
  { key: '{{sender.name}}', description: 'Your full name' },
  { key: '{{sender.firstName}}', description: 'Your first name' },
  { key: '{{sender.company}}', description: 'Your company name' },
  { key: '{{sender.role}}', description: 'Your job title' },
];

export default function TemplateEditorPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [template, setTemplate] = useState<TemplateWithMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: '',
    category: 'General',
    tags: [] as string[],
    isFavorite: false,
    isPublic: false,
  });

  const isNewTemplate = params.id === 'new';

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user?.id) {
      router.push('/signin');
      return;
    }

    if (isNewTemplate) {
      setLoading(false);
      resetForm();
    } else {
      fetchTemplate();
    }
  }, [session, status, params.id, router]);

  // Auto-save functionality (debounced and skip if no changes)
  useEffect(() => {
    if (!autoSaveEnabled || isNewTemplate || !template) return;

    const unchanged = JSON.stringify({
      name: template.name || '',
      subject: template.subject || '',
      content: template.content || '',
      category: template.category || 'General',
      tags: template.tags || [],
      isFavorite: template.isFavorite || false,
      isPublic: template.isPublic || false,
    }) === JSON.stringify(formData);

    if (unchanged) return;

    const timeoutId = setTimeout(() => {
      handleSave(false); // Silent save
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [formData, autoSaveEnabled, isNewTemplate, template]);

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/cold-outreach/templates/${params.id}`);
      if (!response.ok) throw new Error('Failed to fetch template');

      const data = await response.json();
      setTemplate(data.template);
      setFormData({
        name: data.template.name || '',
        subject: data.template.subject || '',
        content: data.template.content || '',
        category: data.template.category || 'General',
        tags: data.template.tags || [],
        isFavorite: data.template.isFavorite || false,
        isPublic: data.template.isPublic || false,
      });
    } catch (err) {
      console.error('Error fetching template:', err);
      setError(err instanceof Error ? err.message : 'Failed to load template');
      toast({
        title: 'Error',
        description: 'Failed to load template',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      subject: '',
      content: '',
      category: 'General',
      tags: [],
      isFavorite: false,
      isPublic: false,
    });
  }, []);

  const handleSave = async (showToast = true) => {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.content.trim()) {
      if (showToast) {
        toast({
          title: 'Validation Error',
          description: 'Name, subject, and content are required',
          variant: 'destructive',
        });
      }
      return;
    }

    try {
      setSaving(true);
      const url = isNewTemplate ? '/api/cold-outreach/templates' : `/api/cold-outreach/templates/${params.id}`;
      const method = isNewTemplate ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save template');

      const data = await response.json();

      if (isNewTemplate) {
        router.push(`/tools/cold-connect-automator/templates/${data.template.id}/edit`);
      } else {
        setTemplate(data.template);
        setLastSaved(new Date());
      }

      if (showToast) {
        toast({
          title: 'Success',
          description: `Template ${isNewTemplate ? 'created' : 'saved'} successfully`,
        });
      }
    } catch (err) {
      console.error('Error saving template:', err);
      if (showToast) {
        toast({
          title: 'Error',
          description: 'Failed to save template',
          variant: 'destructive',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isNewTemplate) return;

    try {
      const response = await fetch(`/api/cold-outreach/templates/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete template');

      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });
      router.push('/tools/cold-connect-automator/templates');
    } catch (err) {
      console.error('Error deleting template:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('template-content') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    setFormData(prev => ({
      ...prev,
      content: before + variable + after
    }));

    // Focus back to textarea and set cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + variable.length, start + variable.length);
    }, 0);
  };

  const loadPrebuiltTemplate = (prebuilt: typeof PREBUILT_TEMPLATES[0]) => {
    setFormData({
      name: prebuilt.name,
      subject: prebuilt.subject,
      content: prebuilt.content,
      category: prebuilt.category,
      tags: prebuilt.tags,
      isFavorite: false,
      isPublic: false,
    });
    setShowTemplates(false);
    toast({
      title: 'Template Loaded',
      description: 'Pre-built template has been loaded into the editor',
    });
  };

  const previewContent = useMemo(() => {
    let content = formData.content;
    // Replace variables with example values for preview
    TEMPLATE_VARIABLES.forEach(variable => {
      content = content.replace(new RegExp(variable.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), variable.example);
    });
    return content;
  }, [formData.content]);

  const addTag = (tag: string) => {
    if (tag.trim() && !formData.tags.includes(tag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag.trim()]
      }));
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const wordCount = formData.content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const characterCount = formData.content.length;

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading template editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isNewTemplate ? 'Create Template' : 'Edit Template'}
            </h1>
            <p className="text-muted-foreground">
              {isNewTemplate ? 'Create a new email template' : 'Edit your email template'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-sm text-muted-foreground">
              Last saved {formatDistanceToNow(lastSaved, { addSuffix: true })}
            </span>
          )}
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showPreview ? 'Hide' : 'Preview'}
          </Button>
          <Button onClick={() => handleSave()} disabled={saving}>
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? 'Saving...' : 'Save'}
          </Button>
          {!isNewTemplate && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Template</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{template?.name}&quot;? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="template-name">Template Name *</Label>
                  <Input
                    id="template-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Initial Outreach - SaaS"
                  />
                </div>
                <div>
                  <Label htmlFor="template-category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="General">General</SelectItem>
                      <SelectItem value="SaaS">SaaS</SelectItem>
                      <SelectItem value="B2B">B2B</SelectItem>
                      <SelectItem value="Follow-up">Follow-up</SelectItem>
                      <SelectItem value="Networking">Networking</SelectItem>
                      <SelectItem value="Sales">Sales</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="template-subject">Subject Line *</Label>
                <Input
                  id="template-subject"
                  value={formData.subject}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Following up on our conversation"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="template-content">Email Content *</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowVariables(!showVariables)}
                    >
                      <Code className="h-4 w-4 mr-2" />
                      Variables
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTemplates(!showTemplates)}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Templates
                    </Button>
                  </div>
                </div>
                <Textarea
                  id="template-content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Dear {{recipient.name}},&#10;&#10;I hope this email finds you well..."
                  rows={12}
                  className="font-mono text-sm"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{wordCount} words</span>
                  <span>{characterCount} characters</span>
                </div>
              </div>

              <div>
                <Label>Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {tag}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const input = e.target as HTMLInputElement;
                        addTag(input.value);
                        input.value = '';
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const input = document.querySelector('input[placeholder="Add a tag..."]') as HTMLInputElement;
                      if (input?.value) {
                        addTag(input.value);
                        input.value = '';
                      }
                    }}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Variables Panel */}
          {showVariables && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Template Variables
                </CardTitle>
                <CardDescription>
                  Click on any variable to insert it into your template content.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {TEMPLATE_VARIABLES.map((variable, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      className="justify-start h-auto p-3"
                      onClick={() => insertVariable(variable.name)}
                    >
                      <div className="text-left">
                        <code className="text-sm font-mono bg-muted px-1 py-0.5 rounded">
                          {variable.name}
                        </code>
                        <p className="text-xs text-muted-foreground mt-1">
                          {variable.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Example: {variable.example}
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Templates Panel */}
          {showTemplates && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Pre-built Templates
                </CardTitle>
                <CardDescription>
                  Start with a professionally crafted template and customize it to your needs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  {PREBUILT_TEMPLATES.map((prebuilt, index) => (
                    <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold">{prebuilt.name}</h4>
                            <p className="text-sm text-muted-foreground">{prebuilt.subject}</p>
                          </div>
                          <Badge>{prebuilt.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {prebuilt.content.substring(0, 150)}...
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1">
                            {prebuilt.tags.map((tag, tagIndex) => (
                              <Badge key={tagIndex} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <Button size="sm" onClick={() => loadPrebuiltTemplate(prebuilt)}>
                            Use Template
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Preview */}
          {showPreview && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Live Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Subject:</Label>
                    <p className="text-sm bg-muted p-2 rounded">{formData.subject || 'No subject'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Content:</Label>
                    <div className="text-sm bg-muted p-3 rounded whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {previewContent || 'No content'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-save">Auto-save</Label>
                <input
                  id="auto-save"
                  type="checkbox"
                  checked={autoSaveEnabled}
                  onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="favorite">Favorite</Label>
                <input
                  id="favorite"
                  type="checkbox"
                  checked={formData.isFavorite}
                  onChange={(e) => setFormData(prev => ({ ...prev, isFavorite: e.target.checked }))}
                  className="rounded"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="public">Public</Label>
                <input
                  id="public"
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => setFormData(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="rounded"
                />
              </div>
            </CardContent>
          </Card>

          {/* Template Stats */}
          {!isNewTemplate && template && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Usage Count</span>
                  <span className="font-semibold">{template.usageCount || 0}</span>
                </div>
                {template.performance?.openRate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Open Rate</span>
                    <span className="font-semibold">{template.performance.openRate.toFixed(1)}%</span>
                  </div>
                )}
                {template.performance?.clickRate && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Click Rate</span>
                    <span className="font-semibold">{template.performance.clickRate.toFixed(1)}%</span>
                  </div>
                )}
                {template.lastUsed && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Used</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(template.lastUsed, { addSuffix: true })}
                    </span>
                  </div>
                )}
            </CardContent>
            </Card>
          )}

          {/* Tips */}
          <Card>
            <CardHeader>
              <CardTitle>Tips for Better Templates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p>Use personalization variables to make emails feel personal</p>
              </div>
              <div className="flex gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p>Keep subject lines under 50 characters for better open rates</p>
              </div>
              <div className="flex gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p>Focus on value proposition in the first few sentences</p>
              </div>
              <div className="flex gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p>Include a clear call-to-action</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}