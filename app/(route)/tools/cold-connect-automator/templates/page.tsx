"use client";

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Copy,
  AlertCircle,
  Search,
  Filter,
  Tag,
  Calendar,
  Eye,
  Star,
  Download,
  Upload,
  BarChart3,
  TrendingUp,
  Users,
  Mail,
  Zap,
  CheckCircle,
  X,
  Save,
  RefreshCw,
  MoreHorizontal,
  Grid,
  List,
  Settings,
  Palette,
  Code,
  FileText,
  Sparkles,
  Target,
  Award,
  Clock,
  ThumbsUp
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

interface TemplateMetrics {
  totalTemplates: number;
  activeTemplates: number;
  totalUsage: number;
  avgPerformance: {
    openRate: number;
    clickRate: number;
    replyRate: number;
    conversionRate: number;
  };
  topTemplates: Array<{
    id: string;
    name: string;
    usageCount: number;
    performance: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    count: number;
    avgPerformance: number;
  }>;
}

interface FilterOptions {
  search: string;
  category: string;
  tags: string[];
  performance: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list';
}

const TemplateCard = memo(({
  template,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleFavorite,
  onViewDetails,
  viewMode = 'grid'
}: {
  template: TemplateWithMetadata;
  onEdit: (template: TemplateWithMetadata) => void;
  onDelete: (id: string) => void;
  onDuplicate: (template: TemplateWithMetadata) => void;
  onToggleFavorite: (id: string) => void;
  onViewDetails: (template: TemplateWithMetadata) => void;
  viewMode?: 'grid' | 'list';
}) => {
  const getPerformanceColor = (rate?: number) => {
    if (!rate) return 'text-gray-400';
    if (rate >= 80) return 'text-green-400';
    if (rate >= 60) return 'text-blue-400';
    if (rate >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPerformanceBadge = (rate?: number) => {
    if (!rate) return null;
    if (rate >= 80) return <Award className="h-3 w-3 text-green-400" />;
    if (rate >= 60) return <ThumbsUp className="h-3 w-3 text-blue-400" />;
    return null;
  };

  if (viewMode === 'list') {
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-lg">{template.name}</h3>
                  {template.isFavorite && <Star className="h-4 w-4 text-yellow-400 fill-current" />}
                  {getPerformanceBadge(template.performance?.openRate)}
                </div>
                <p className="text-sm text-muted-foreground mb-2">{template.subject}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {template.category && <Badge variant="outline" className="text-xs">{template.category}</Badge>}
                  <span>Used {template.usageCount || 0} times</span>
                  {template.lastUsed && (
                    <span>Last used {formatDistanceToNow(template.lastUsed, { addSuffix: true })}</span>
                  )}
                  {template.performance?.openRate && (
                    <span className={getPerformanceColor(template.performance.openRate)}>
                      {template.performance.openRate.toFixed(1)}% open rate
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => onViewDetails(template)}>
                <Eye className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => onEdit(template)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => onDuplicate(template)}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => onToggleFavorite(template.id!)}>
                <Star className={`h-4 w-4 ${template.isFavorite ? 'text-yellow-400 fill-current' : ''}`} />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Template</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete &quot;{template.name}&quot;? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(template.id!)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base line-clamp-1">{template.name}</CardTitle>
              <CardDescription className="line-clamp-1">{template.subject}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {template.isFavorite && <Star className="h-4 w-4 text-yellow-400 fill-current" />}
            {getPerformanceBadge(template.performance?.openRate)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-sm text-muted-foreground line-clamp-2 mb-3 h-10">
          {template.content.substring(0, 100)}...
        </div>

        <div className="flex items-center justify-between mb-3">
          {template.category && (
            <Badge variant="secondary" className="text-xs">{template.category}</Badge>
          )}
          <div className="text-xs text-muted-foreground">
            Used {template.usageCount || 0} times
          </div>
        </div>

        {template.performance && (
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
            {template.performance.openRate && (
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span className={getPerformanceColor(template.performance.openRate)}>
                  {template.performance.openRate.toFixed(1)}% open
                </span>
              </div>
            )}
            {template.performance.clickRate && (
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                <span className={getPerformanceColor(template.performance.clickRate)}>
                  {template.performance.clickRate.toFixed(1)}% click
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {template.updatedAt ? formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true }) : 'Recently created'}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="ghost" onClick={() => onViewDetails(template)}>
              <Eye className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onEdit(template)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDuplicate(template)}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onToggleFavorite(template.id!)}>
              <Star className={`h-4 w-4 ${template.isFavorite ? 'text-yellow-400 fill-current' : ''}`} />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

TemplateCard.displayName = 'TemplateCard';

const MetricCard = memo(({
  title,
  value,
  change,
  icon: Icon,
  color,
  loading = false
}: {
  title: string;
  value: string;
  change?: string;
  icon: any;
  color: string;
  loading?: boolean;
}) => (
  <Card>
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-16 mt-1" />
          ) : (
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{value}</p>
              {change && (
                <span className={`text-sm ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {change}
                </span>
              )}
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </CardContent>
  </Card>
));

MetricCard.displayName = 'MetricCard';

export default function TemplatesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [templates, setTemplates] = useState<TemplateWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateWithMetadata | null>(null);
  const [metrics, setMetrics] = useState<TemplateMetrics | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    category: 'all',
    tags: [],
    performance: 'all',
    sortBy: 'updated',
    sortOrder: 'desc',
    viewMode: 'grid',
  });
  const { toast } = useToast();

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    content: '',
    category: 'General',
    tags: [] as string[],
  });

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user?.id) {
      router.push('/signin');
      return;
    }

    fetchTemplates();
    fetchMetrics();

    // Auto-refresh every 60 seconds
    const interval = setInterval(() => {
      fetchTemplates();
      fetchMetrics();
    }, 60000);

    return () => clearInterval(interval);
  }, [session, status, router]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cold-outreach/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');

      const data = await response.json();
      setTemplates(data.templates || []);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError(err instanceof Error ? err.message : 'Failed to load templates');
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/cold-outreach/templates/metrics');
      if (!response.ok) throw new Error('Failed to fetch metrics');

      const data = await response.json();
      setMetrics(data.metrics);
    } catch (err) {
      console.error('Error fetching metrics:', err);
      // Don't show error toast for metrics as it's not critical
    }
  };

  const filteredTemplates = useMemo(() => {
    let filtered = [...templates];

    // Search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm) ||
        template.subject.toLowerCase().includes(searchTerm) ||
        template.content.toLowerCase().includes(searchTerm) ||
        template.category?.toLowerCase().includes(searchTerm) ||
        template.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(template => template.category === filters.category);
    }

    // Tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(template =>
        filters.tags.every(tag => template.tags?.includes(tag))
      );
    }

    // Performance filter
    if (filters.performance !== 'all') {
      filtered = filtered.filter(template => {
        const openRate = template.performance?.openRate || 0;
        switch (filters.performance) {
          case 'high': return openRate >= 80;
          case 'medium': return openRate >= 60 && openRate < 80;
          case 'low': return openRate >= 40 && openRate < 60;
          case 'very-low': return openRate < 40;
          default: return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'usage':
          aValue = a.usageCount || 0;
          bValue = b.usageCount || 0;
          break;
        case 'performance':
          aValue = a.performance?.openRate || 0;
          bValue = b.performance?.openRate || 0;
          break;
        case 'created':
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
        default:
          aValue = new Date(a.updatedAt || 0).getTime();
          bValue = new Date(b.updatedAt || 0).getTime();
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [templates, filters]);

  const resetForm = useCallback(() => {
    setFormData({
      name: '',
      subject: '',
      content: '',
      category: 'General',
      tags: [],
    });
  }, []);

  const handleCreateTemplate = async () => {
    if (!formData.name.trim() || !formData.subject.trim() || !formData.content.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name, subject, and content are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/cold-outreach/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create template');

      const data = await response.json();
      setTemplates(prev => [data.template, ...prev]);
      setShowCreateDialog(false);
      resetForm();
      toast({
        title: 'Success',
        description: 'Template created successfully',
      });
      fetchMetrics();
    } catch (err) {
      console.error('Error creating template:', err);
      toast({
        title: 'Error',
        description: 'Failed to create template',
        variant: 'destructive',
      });
    }
  };

  const handleEditTemplate = (template: TemplateWithMetadata) => {
    router.push(`/tools/cold-connect-automator/templates/${template.id}/edit`);
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      const response = await fetch(`/api/cold-outreach/templates/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete template');

      setTemplates(prev => prev.filter(t => t.id !== id));
      toast({
        title: 'Success',
        description: 'Template deleted successfully',
      });
      fetchMetrics();
    } catch (err) {
      console.error('Error deleting template:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete template',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicateTemplate = async (template: TemplateWithMetadata) => {
    try {
      const response = await fetch('/api/cold-outreach/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          subject: template.subject,
          content: template.content,
          category: template.category || 'General',
          tags: template.tags || [],
        }),
      });

      if (!response.ok) throw new Error('Failed to duplicate template');

      const data = await response.json();
      setTemplates(prev => [data.template, ...prev]);
      toast({
        title: 'Success',
        description: 'Template duplicated successfully',
      });
    } catch (err) {
      console.error('Error duplicating template:', err);
      toast({
        title: 'Error',
        description: 'Failed to duplicate template',
        variant: 'destructive',
      });
    }
  };

  const handleToggleFavorite = async (id: string) => {
    try {
      const template = templates.find(t => t.id === id);
      if (!template) return;

      const response = await fetch(`/api/cold-outreach/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...template,
          isFavorite: !template.isFavorite,
        }),
      });

      if (!response.ok) throw new Error('Failed to update template');

      const data = await response.json();
      setTemplates(prev => prev.map(t => t.id === id ? data.template : t));
    } catch (err) {
      console.error('Error updating template:', err);
      toast({
        title: 'Error',
        description: 'Failed to update favorite status',
        variant: 'destructive',
      });
    }
  };

  const handleViewDetails = (template: TemplateWithMetadata) => {
    setSelectedTemplate(template);
    setShowDetailsDialog(true);
  };

  const exportTemplates = () => {
    const csvContent = [
      ['Name', 'Subject', 'Category', 'Tags', 'Usage Count', 'Created', 'Updated'],
      ...filteredTemplates.map(template => [
        template.name,
        template.subject,
        template.category || '',
        (template.tags || []).join('; '),
        (template.usageCount || 0).toString(),
        template.createdAt || '',
        template.updatedAt || ''
      ])
    ].map(row => row.map(field => `"${field}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'templates.csv';
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: 'Success',
      description: 'Templates exported successfully',
    });
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: 'all',
      tags: [],
      performance: 'all',
      sortBy: 'updated',
      sortOrder: 'desc',
      viewMode: 'grid',
    });
  };

  // Get unique categories and tags
  const categories = Array.from(new Set(templates.map(t => t.category).filter(Boolean)));
  const allTags = Array.from(new Set(templates.flatMap(t => t.tags || [])));

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/tools/cold-connect-automator')}
        className="-ml-2 w-fit text-muted-foreground hover:text-primary"
        aria-label="Back to Cold Connect dashboard"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Templates</h1>
          <p className="text-muted-foreground">Create and manage professional email templates for your cold outreach campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportTemplates}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Template</DialogTitle>
                <DialogDescription>
                  Create a new email template for your cold outreach campaigns.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
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
                  <Label htmlFor="template-subject">Subject Line *</Label>
                  <Input
                    id="template-subject"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Following up on our conversation"
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
                <div>
                  <Label htmlFor="template-content">Email Content *</Label>
                  <Textarea
                    id="template-content"
                    value={formData.content}
                    onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Dear {{recipient.name}},&#10;&#10;I hope this email finds you well..."
                    rows={8}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Use variables like {"{recipient.name}"}, {"{sender.name}"}, {"{company.name}"} in your content.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateTemplate}>
                  Create Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="gallery">Gallery</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters & Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="template-search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="template-search"
                      placeholder="Search templates..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select
                    value={filters.category}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category!}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Performance</Label>
                  <Select
                    value={filters.performance}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, performance: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Performance</SelectItem>
                      <SelectItem value="high">High (80%+)</SelectItem>
                      <SelectItem value="medium">Medium (60-79%)</SelectItem>
                      <SelectItem value="low">Low (40-59%)</SelectItem>
                      <SelectItem value="very-low">Very Low ({'<'}40%)</SelectItem>                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sort By</Label>
                  <Select
                    value={filters.sortBy}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, sortBy: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="updated">Last Updated</SelectItem>
                      <SelectItem value="created">Date Created</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                      <SelectItem value="usage">Usage Count</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-between items-center mt-4">
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant={filters.viewMode === 'grid' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, viewMode: 'grid' }))}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={filters.viewMode === 'list' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, viewMode: 'list' }))}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Templates Grid/List */}
          {error ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Error Loading Templates</h3>
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button onClick={() => fetchTemplates()}>Try Again</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className={filters.viewMode === 'grid'
              ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
            }>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-1/2 mt-2" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full mb-2" />
                      <Skeleton className="h-4 w-2/3 mb-4" />
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                        <Skeleton className="h-8 w-8 rounded" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : filteredTemplates.length === 0 ? (
                <div className="col-span-full">
                  <Card>
                    <CardContent className="flex items-center justify-center py-12">
                      <div className="text-center">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Templates Found</h3>
                        <p className="text-muted-foreground mb-6">
                          {filters.search || filters.category !== 'all' || filters.performance !== 'all'
                            ? 'No templates match your current filters.'
                            : 'Start building your template library by creating your first template.'}
                        </p>
                        {(!filters.search && filters.category === 'all' && filters.performance === 'all') && (
                          <Button onClick={() => setShowCreateDialog(true)}>
                            <Plus className="h-4 w-4 mr-2" />
                            Create Your First Template
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                filteredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onEdit={handleEditTemplate}
                    onDelete={handleDeleteTemplate}
                    onDuplicate={handleDuplicateTemplate}
                    onToggleFavorite={handleToggleFavorite}
                    onViewDetails={handleViewDetails}
                    viewMode={filters.viewMode}
                  />
                ))
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="gallery" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Gallery</CardTitle>
              <CardDescription>Browse pre-built templates and get inspired</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Gallery Coming Soon</h3>
                <p className="text-muted-foreground">Pre-built templates and inspiration gallery will be available here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Templates"
              value={metrics?.totalTemplates.toString() || '0'}
              icon={FileText}
              color="bg-blue-500/20 text-blue-400"
              loading={!metrics}
            />
            <MetricCard
              title="Active Templates"
              value={metrics?.activeTemplates.toString() || '0'}
              icon={Zap}
              color="bg-green-500/20 text-green-400"
              loading={!metrics}
            />
            <MetricCard
              title="Total Usage"
              value={metrics?.totalUsage.toString() || '0'}
              icon={Users}
              color="bg-purple-500/20 text-purple-400"
              loading={!metrics}
            />
            <MetricCard
              title="Avg Open Rate"
              value={`${metrics?.avgPerformance.openRate.toFixed(1) || '0'}%`}
              icon={TrendingUp}
              color="bg-orange-500/20 text-orange-400"
              loading={!metrics}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Template Analytics</CardTitle>
              <CardDescription>Detailed insights into your template performance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Analytics Coming Soon</h3>
                <p className="text-muted-foreground">Advanced template analytics and insights will be available here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Template Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Template Details</DialogTitle>
            <DialogDescription>
              Detailed information about {selectedTemplate?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-xl font-semibold">{selectedTemplate.name}</h3>
                    {selectedTemplate.isFavorite && <Star className="h-5 w-5 text-yellow-400 fill-current" />}
                  </div>
                  <p className="text-muted-foreground">{selectedTemplate.subject}</p>
                  {selectedTemplate.category && (
                    <Badge className="mt-2">{selectedTemplate.category}</Badge>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Usage Statistics</Label>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Used {selectedTemplate.usageCount || 0} times</p>
                      {selectedTemplate.lastUsed && (
                        <p className="text-sm text-muted-foreground">
                          Last used {formatDistanceToNow(selectedTemplate.lastUsed, { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Performance</Label>
                    <div className="space-y-2">
                      {selectedTemplate.performance?.openRate && (
                        <p className="text-sm text-muted-foreground">
                          Open Rate: {selectedTemplate.performance.openRate.toFixed(1)}%
                        </p>
                      )}
                      {selectedTemplate.performance?.clickRate && (
                        <p className="text-sm text-muted-foreground">
                          Click Rate: {selectedTemplate.performance.clickRate.toFixed(1)}%
                        </p>
                      )}
                      {selectedTemplate.performance?.replyRate && (
                        <p className="text-sm text-muted-foreground">
                          Reply Rate: {selectedTemplate.performance.replyRate.toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Tags</Label>
                    <div className="flex flex-wrap gap-1">
                      {selectedTemplate.tags?.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {tag}
                        </Badge>
                      )) || <p className="text-sm text-muted-foreground">No tags</p>}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Timestamps</Label>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Created: {selectedTemplate.createdAt ? new Date(selectedTemplate.createdAt).toLocaleDateString() : 'Unknown'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Updated: {selectedTemplate.updatedAt ? new Date(selectedTemplate.updatedAt).toLocaleDateString() : 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Content Preview</Label>
                <div className="mt-2 p-4 bg-muted rounded-lg max-h-48 overflow-y-auto">
                  <pre className="text-sm whitespace-pre-wrap">{selectedTemplate.content}</pre>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => handleEditTemplate(selectedTemplate)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Template
                </Button>
                <Button variant="outline" onClick={() => handleDuplicateTemplate(selectedTemplate)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </Button>
                <Button variant="outline" onClick={() => handleToggleFavorite(selectedTemplate.id!)}>
                  <Star className={`h-4 w-4 mr-2 ${selectedTemplate.isFavorite ? 'text-yellow-400 fill-current' : ''}`} />
                  {selectedTemplate.isFavorite ? 'Unfavorite' : 'Favorite'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
 
