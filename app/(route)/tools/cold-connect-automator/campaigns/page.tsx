"use client";

import { useState, useEffect, useMemo, useCallback, memo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { CampaignProgressTracker } from '@/components/cold-connect-automator/CampaignProgressTracker';
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Play,
  Pause,
  Square,
  BarChart3,
  Users,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  RefreshCw,
  Download,
  Copy,
  Settings,
  Target,
  Zap,
  Activity,
  PieChart,
  LineChart,
  Eye,
  MousePointerClick,
  Reply,
  Send,
  AlertTriangle,
  Check,
  X,
  Loader2
} from 'lucide-react';
import { Campaign } from '@/lib/cold-outreach/campaigns';
import { format, isWithinInterval, startOfDay, endOfDay, subDays, subWeeks, subMonths } from 'date-fns';

interface CampaignWithStats extends Campaign {
  contactCount?: number;
  sentCount?: number;
  openRate?: number;
  replyRate?: number;
  clickRate?: number;
  bounceRate?: number;
  performance?: PerformanceLevel;
  lastActivity?: Date;
  estimatedCompletion?: Date;
  insights?: string[];
  optimalSendTime?: { hour: number; day: string };
}

interface CampaignMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  totalContacts: number;
  totalSent: number;
  averageOpenRate: number;
  averageReplyRate: number;
  averageClickRate: number;
}

interface FilterOptions {
  status: string;
  dateRange: string;
  performance: string;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const performanceLevels = ['excellent', 'good', 'average', 'poor'] as const;
type PerformanceLevel = typeof performanceLevels[number];

const toNumber = (value: unknown, fallback = 0) => {
  const num = typeof value === 'number' ? value : Number(value ?? fallback);
  return Number.isFinite(num) ? num : fallback;
};

const parseDate = (value?: string | Date | null) => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const parseNullableDate = (value?: string | Date | null) => {
  if (value === null || value === undefined) return null;
  return parseDate(value) ?? null;
};

const isPerformanceValue = (value: unknown): value is PerformanceLevel => {
  if (typeof value !== 'string') return false;
  return performanceLevels.includes(value as PerformanceLevel);
};

const normalizeCampaignData = (campaign: any): CampaignWithStats => {
  const rawPerformance = campaign?.performance;
  const performance = isPerformanceValue(rawPerformance) ? rawPerformance : 'average';

  const rawOptimal = campaign?.optimalSendTime && typeof campaign.optimalSendTime === 'object'
    ? {
        hour: toNumber((campaign.optimalSendTime as any).hour),
        day: String((campaign.optimalSendTime as any).day ?? ''),
      }
    : undefined;
  const optimalSendTime = rawOptimal && rawOptimal.day ? rawOptimal : undefined;

  return {
    ...campaign,
    createdAt: parseDate(campaign?.createdAt),
    updatedAt: parseDate(campaign?.updatedAt),
    startDate: parseNullableDate(campaign?.startDate),
    endDate: parseNullableDate(campaign?.endDate),
    contactCount: toNumber(campaign?.contactCount),
    sentCount: toNumber(campaign?.sentCount),
    openRate: toNumber(campaign?.openRate),
    replyRate: toNumber(campaign?.replyRate),
    clickRate: toNumber(campaign?.clickRate),
    bounceRate: toNumber(campaign?.bounceRate),
    performance,
    lastActivity: parseDate(campaign?.lastActivity),
    estimatedCompletion: parseDate(campaign?.estimatedCompletion),
    insights: Array.isArray(campaign?.insights) ? campaign.insights.map(String) : [],
    optimalSendTime,
  };
};

const MetricCard = memo(({ title, value, change, icon: Icon, color, loading }: {
  title: string;
  value: string | number;
  change?: string;
  icon: any;
  color: string;
  loading?: boolean;
}) => (
  <Card className="relative overflow-hidden">
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

const CampaignCard = memo(({ campaign, onEdit, onDelete, onStatusChange, onViewDetails }: {
  campaign: CampaignWithStats;
  onEdit: (campaign: Campaign) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  onViewDetails: (campaign: CampaignWithStats) => void;
}) => {
  const getPerformanceColor = (performance?: string) => {
    switch (performance) {
      case 'excellent': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'good': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'average': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'poor': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      case 'draft': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <Play className="h-3 w-3" />;
      case 'paused': return <Pause className="h-3 w-3" />;
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      case 'draft': return <Clock className="h-3 w-3" />;
      default: return <AlertCircle className="h-3 w-3" />;
    }
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 group">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate group-hover:text-primary transition-colors">
              {campaign.name}
            </CardTitle>
            {campaign.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {campaign.description}
              </CardDescription>
            )}
          </div>
          <div className="flex gap-2" role="group" aria-label={`Status and performance for ${campaign.name}`}>
            {campaign.performance && (
              <Badge className={getPerformanceColor(campaign.performance)} aria-label={`Performance: ${campaign.performance}`}>
                {campaign.performance}
              </Badge>
            )}
            <Badge className={`${getStatusColor(campaign.status)} text-white flex items-center gap-1`} aria-label={`Status: ${campaign.status}`}>
              {getStatusIcon(campaign.status)}
              {campaign.status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        {campaign.status === 'active' && campaign.contactCount && campaign.sentCount && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">
                {Math.round((campaign.sentCount / campaign.contactCount) * 100)}%
              </span>
            </div>
            <Progress
              value={(campaign.sentCount / campaign.contactCount) * 100}
              className="h-2"
            />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{campaign.contactCount || 0} contacts</span>
          </div>
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-muted-foreground" />
            <span>{campaign.sentCount || 0} sent</span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span>{campaign.openRate || 0}% open</span>
          </div>
          <div className="flex items-center gap-2">
            <Reply className="h-4 w-4 text-muted-foreground" />
            <span>{campaign.replyRate || 0}% reply</span>
          </div>
        </div>

        {/* Additional Info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {campaign.startDate && format(new Date(campaign.startDate), 'MMM dd')}
            {campaign.startDate && campaign.endDate && ' - '}
            {campaign.endDate && format(new Date(campaign.endDate), 'MMM dd')}
          </div>
          {campaign.lastActivity && (
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {format(new Date(campaign.lastActivity), 'MMM dd')}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2" role="group" aria-label={`Actions for ${campaign.name}`}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onViewDetails(campaign)}
            className="flex-1"
            aria-label={`View details for ${campaign.name}`}
          >
            <BarChart3 className="h-3 w-3 mr-1" aria-hidden="true" />
            Details
          </Button>

          {campaign.status === 'draft' && (
            <Button
              size="sm"
              onClick={() => campaign.id && onStatusChange(campaign.id, 'active')}
              disabled={!campaign.id}
              aria-label={`Start campaign ${campaign.name}`}
            >
              <Play className="h-3 w-3 mr-1" aria-hidden="true" />
              Start
            </Button>
          )}
          {campaign.status === 'active' && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => campaign.id && onStatusChange(campaign.id, 'paused')}
              disabled={!campaign.id}
              aria-label={`Pause campaign ${campaign.name}`}
            >
              <Pause className="h-3 w-3 mr-1" aria-hidden="true" />
              Pause
            </Button>
          )}
          {campaign.status === 'paused' && (
            <Button
              size="sm"
              onClick={() => campaign.id && onStatusChange(campaign.id, 'active')}
              disabled={!campaign.id}
              aria-label={`Resume campaign ${campaign.name}`}
            >
              <Play className="h-3 w-3 mr-1" aria-hidden="true" />
              Resume
            </Button>
          )}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(campaign)}
              aria-label={`Edit campaign ${campaign.name}`}
            >
              <Edit className="h-3 w-3" aria-hidden="true" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" aria-label={`Delete campaign ${campaign.name}`}>
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &ldquo;{campaign.name}&rdquo;? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(campaign.id!)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
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
});

CampaignCard.displayName = 'CampaignCard';

export default function CampaignsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 py-8 px-4 sm:px-6 lg:px-8"><div className="max-w-7xl mx-auto text-gray-400">Loading campaigns...</div></div>}>
      <CampaignsContent />
    </Suspense>
  );
}

function CampaignsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const [campaigns, setCampaigns] = useState<CampaignWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignWithStats | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const { toast } = useToast();
  const createParam = searchParams.get('create');

  useEffect(() => {
    if (createParam === '1') {
      setShowCreateDialog(true);
      router.replace('/tools/cold-connect-automator/campaigns', { scroll: false });
    }
  }, [createParam, router]);

  // Filter states
  const [filters, setFilters] = useState<FilterOptions>({
    status: 'all',
    dateRange: 'all',
    performance: 'all',
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'draft' as const,
    startDate: '',
    endDate: '',
  });

  // Metrics state
  const [metrics, setMetrics] = useState<CampaignMetrics>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    completedCampaigns: 0,
    totalContacts: 0,
    totalSent: 0,
    averageOpenRate: 0,
    averageReplyRate: 0,
    averageClickRate: 0
  });

  const fetchCampaigns = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setRefreshing(silent);

      const response = await fetch('/api/cold-outreach/campaigns');
      if (!response.ok) throw new Error('Failed to fetch campaigns');

      const data = await response.json();
      const campaignsWithStats = (data.campaigns || []).map(normalizeCampaignData);

      setCampaigns(campaignsWithStats);
      calculateMetrics(campaignsWithStats);
    } catch (err) {
      console.error('Error fetching campaigns:', err);
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
      if (!silent) {
        toast({
          title: 'Error',
          description: 'Failed to load campaigns',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  // Auto-refresh interval
  useEffect(() => {
    if (sessionStatus === 'loading') return;

    if (!session?.user?.id) {
      router.push('/signin');
      return;
    }

    fetchCampaigns();

    // Set up auto-refresh for active campaigns
    const interval = setInterval(() => {
      if (campaigns.some(c => c.status === 'active')) {
        fetchCampaigns(true);
      }
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [session, sessionStatus, router, fetchCampaigns]);
  const calculateMetrics = useCallback((campaignList: CampaignWithStats[]) => {
    const totalCampaigns = campaignList.length;
    const activeCampaigns = campaignList.filter(c => c.status === 'active').length;
    const completedCampaigns = campaignList.filter(c => c.status === 'completed').length;
    const totalContacts = campaignList.reduce((sum, c) => sum + (c.contactCount || 0), 0);
    const totalSent = campaignList.reduce((sum, c) => sum + (c.sentCount || 0), 0);
    const averageOpenRate = campaignList.length > 0
      ? campaignList.reduce((sum, c) => sum + (c.openRate || 0), 0) / campaignList.length
      : 0;
    const averageReplyRate = campaignList.length > 0
      ? campaignList.reduce((sum, c) => sum + (c.replyRate || 0), 0) / campaignList.length
      : 0;
    const averageClickRate = campaignList.length > 0
      ? campaignList.reduce((sum, c) => sum + (c.clickRate || 0), 0) / campaignList.length
      : 0;

    setMetrics({
      totalCampaigns,
      activeCampaigns,
      completedCampaigns,
      totalContacts,
      totalSent,
      averageOpenRate: Math.round(averageOpenRate * 10) / 10,
      averageReplyRate: Math.round(averageReplyRate * 10) / 10,
      averageClickRate: Math.round(averageClickRate * 10) / 10
    });
  }, []);

  const handleCreateCampaign = async () => {
    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Campaign name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/cold-outreach/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to create campaign');

      const data = await response.json();
      const createdCampaign = normalizeCampaignData(data.campaign);

      setCampaigns(prev => {
        const updated = [createdCampaign, ...prev];
        calculateMetrics(updated);
        return updated;
      });
      setShowCreateDialog(false);
      resetForm();

      toast({
        title: 'Success',
        description: 'Campaign created successfully',
      });
    } catch (err) {
      console.error('Error creating campaign:', err);
      toast({
        title: 'Error',
        description: 'Failed to create campaign',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateCampaign = async () => {
    if (!selectedCampaign || !formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Campaign name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`/api/cold-outreach/campaigns/${selectedCampaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to update campaign');

      const data = await response.json();
      const updatedCampaign = normalizeCampaignData(data.campaign);

      setCampaigns(prev => {
        const updatedList = prev.map(c => c.id === selectedCampaign.id ? updatedCampaign : c);
        calculateMetrics(updatedList);
        return updatedList;
      });
      setShowEditDialog(false);
      setSelectedCampaign(null);
      resetForm();

      toast({
        title: 'Success',
        description: 'Campaign updated successfully',
      });
    } catch (err) {
      console.error('Error updating campaign:', err);
      toast({
        title: 'Error',
        description: 'Failed to update campaign',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      const response = await fetch(`/api/cold-outreach/campaigns/${campaignId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete campaign');

      setCampaigns(prev => {
        const updated = prev.filter(c => c.id !== campaignId);
        calculateMetrics(updated);
        return updated;
      });

      toast({
        title: 'Success',
        description: 'Campaign deleted successfully',
      });
    } catch (err) {
      console.error('Error deleting campaign:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete campaign',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (campaignId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/cold-outreach/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update campaign status');

      const data = await response.json();
      const normalized = normalizeCampaignData(data.campaign);
      setCampaigns(prev => {
        const updated = prev.map(c => c.id === campaignId ? normalized : c);
        calculateMetrics(updated);
        return updated;
      });

      toast({
        title: 'Success',
        description: `Campaign ${newStatus === 'active' ? 'started' : newStatus === 'paused' ? 'paused' : 'stopped'}`,
      });
    } catch (err) {
      console.error('Error updating campaign status:', err);
      toast({
        title: 'Error',
        description: 'Failed to update campaign status',
        variant: 'destructive',
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      status: 'draft',
      startDate: '',
      endDate: '',
    });
  };

  const openEditDialog = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      status: campaign.status as any,
      startDate: campaign.startDate ? (() => { const d = new Date(campaign.startDate); return d && !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : ''; })() : '',
      endDate: campaign.endDate ? (() => { const d = new Date(campaign.endDate); return d && !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : ''; })() : '',
    });
    setShowEditDialog(true);
  };  const openDetailsDialog = (campaign: CampaignWithStats) => {
    setSelectedCampaign(campaign);
    setShowDetailsDialog(true);
  };

  // Performance optimization: Memoize filtered campaigns
  const filteredCampaigns = useMemo(() => {
    let filtered = campaigns;

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === filters.status);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let dateFilter: { start: Date; end: Date };

      switch (filters.dateRange) {
        case 'today':
          dateFilter = { start: startOfDay(now), end: endOfDay(now) };
          break;
        case 'week':
          dateFilter = { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
          break;
        case 'month':
          dateFilter = { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
          break;
        case 'quarter':
          dateFilter = { start: startOfDay(subDays(now, 90)), end: endOfDay(now) };
          break;
        default:
          dateFilter = { start: new Date(0), end: new Date() };
      }

      filtered = filtered.filter(campaign => {
        const campaignDate = new Date(campaign.createdAt || campaign.startDate || new Date());
        return isWithinInterval(campaignDate, dateFilter);
      });
    }

    // Performance filter
    if (filters.performance !== 'all') {
      filtered = filtered.filter(campaign => campaign.performance === filters.performance);
    }

    // Search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(campaign =>
        campaign.name.toLowerCase().includes(searchTerm) ||
        (campaign.description && campaign.description.toLowerCase().includes(searchTerm))
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (filters.sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'performance':
          const performanceOrder = { excellent: 4, good: 3, average: 2, poor: 1 };
          aValue = performanceOrder[a.performance as keyof typeof performanceOrder] || 0;
          bValue = performanceOrder[b.performance as keyof typeof performanceOrder] || 0;
          break;
        default:
          aValue = a[filters.sortBy as keyof CampaignWithStats];
          bValue = b[filters.sortBy as keyof CampaignWithStats];
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [campaigns, filters]);

  const exportCampaigns = () => {
    const csvData = filteredCampaigns.map(campaign => ({
      Name: campaign.name,
      Description: campaign.description || '',
      Status: campaign.status,
      'Start Date': campaign.startDate ? format(new Date(campaign.startDate), 'yyyy-MM-dd') : '',
      'End Date': campaign.endDate ? format(new Date(campaign.endDate), 'yyyy-MM-dd') : '',
      'Contacts': campaign.contactCount || 0,
      'Sent': campaign.sentCount || 0,
      'Open Rate': `${campaign.openRate || 0}%`,
      'Reply Rate': `${campaign.replyRate || 0}%`,
      'Performance': campaign.performance || ''
    }));

    const csvString = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaigns-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: 'Export Complete',
      description: 'Campaign data exported successfully',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Campaigns</h1>
          <p className="text-sm text-muted-foreground">Manage your outreach campaigns</p>
        </div>

        {/* Metrics Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Skeleton className="h-4 w-20 mb-2" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Campaigns Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Campaigns</h1>
          <p className="text-muted-foreground">Manage and track your cold outreach campaigns</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => fetchCampaigns(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportCampaigns} aria-label="Export campaigns data">
            <Download className="h-4 w-4 mr-2" aria-hidden="true" />
            Export
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2" aria-label="Create a new campaign">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Campaign</DialogTitle>
                <DialogDescription>
                  Set up a new cold outreach campaign to organize your messaging efforts.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Campaign Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Q1 Tech Startups Outreach"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of the campaign goals..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} aria-label="Cancel creating campaign">
                  Cancel
                </Button>
                <Button onClick={handleCreateCampaign} aria-label="Create the new campaign">
                  Create Campaign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Campaigns"
            value={metrics.totalCampaigns}
            icon={Target}
            color="bg-blue-500/20 text-blue-400"
            loading={loading}
          />
          <MetricCard
            title="Active Campaigns"
            value={metrics.activeCampaigns}
            icon={Zap}
            color="bg-green-500/20 text-green-400"
            loading={loading}
          />
          <MetricCard
            title="Avg. Open Rate"
            value={`${metrics.averageOpenRate}%`}
            icon={Eye}
            color="bg-purple-500/20 text-purple-400"
            loading={loading}
          />
          <MetricCard
            title="Avg. Reply Rate"
            value={`${metrics.averageReplyRate}%`}
            icon={Reply}
            color="bg-orange-500/20 text-orange-400"
            loading={loading}
          />
        </div>

          {/* Recent Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Campaigns</CardTitle>
              <CardDescription>Your most recently created campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {campaigns.slice(0, 5).map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        campaign.status === 'active' ? 'bg-green-500/20' :
                        campaign.status === 'completed' ? 'bg-blue-500/20' : 'bg-gray-500/20'
                      }`}>
                        {campaign.status === 'active' && <Play className="h-4 w-4 text-green-400" />}
                        {campaign.status === 'completed' && <CheckCircle className="h-4 w-4 text-blue-400" />}
                        {campaign.status === 'draft' && <Clock className="h-4 w-4 text-gray-400" />}
                      </div>
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {campaign.contactCount || 0} contacts • {campaign.sentCount || 0} sent
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDetailsDialog(campaign)}
                    >
                      View Details
                    </Button>
                  </div>
                ))}
                {campaigns.length === 0 && (
                  <div className="text-center py-8">
                    <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No campaigns yet</p>
                    <Button
                      className="mt-4"
                      onClick={() => setShowCreateDialog(true)}
                    >
                      Create Your First Campaign
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters & Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="campaign-search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input
                      id="campaign-search"
                      placeholder="Search campaigns..."
                      value={filters.search}
                      onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                      className="pl-10"
                      aria-describedby="search-help"
                    />
                  </div>
                  <p id="search-help" className="sr-only">Search by campaign name or description</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger aria-label="Filter campaigns by status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date Range</Label>
                  <Select
                    value={filters.dateRange}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value }))}
                  >
                    <SelectTrigger aria-label="Filter campaigns by date range">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="today">Today</SelectItem>
                      <SelectItem value="week">Last 7 days</SelectItem>
                      <SelectItem value="month">Last 30 days</SelectItem>
                      <SelectItem value="quarter">Last 90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Performance</Label>
                  <Select
                    value={filters.performance}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, performance: value }))}
                  >
                    <SelectTrigger aria-label="Filter campaigns by performance">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Performance</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="average">Average</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Campaigns Grid */}
          {error ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Error Loading Campaigns</h3>
                  <p className="text-muted-foreground mb-4">{error}</p>
                  <Button onClick={() => fetchCampaigns()}>Try Again</Button>
                </div>
              </CardContent>
            </Card>
          ) : filteredCampaigns.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Campaigns Found</h3>
                  <p className="text-muted-foreground mb-6">
                    {filters.search || filters.status !== 'all' || filters.dateRange !== 'all' || filters.performance !== 'all'
                      ? 'No campaigns match your current filters.'
                      : 'Get started by creating your first cold outreach campaign.'}
                  </p>
                  {(!filters.search && filters.status === 'all' && filters.dateRange === 'all' && filters.performance === 'all') && (
                    <Button onClick={() => setShowCreateDialog(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Campaign
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCampaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  onEdit={openEditDialog}
                  onDelete={handleDeleteCampaign}
                  onStatusChange={handleStatusChange}
                  onViewDetails={openDetailsDialog}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
                <CardDescription>Campaign performance metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Open Rate</span>
                    <span className="font-medium">{metrics.averageOpenRate}%</span>
                  </div>
                  <Progress value={metrics.averageOpenRate * 2.5} className="h-2" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Reply Rate</span>
                    <span className="font-medium">{metrics.averageReplyRate}%</span>
                  </div>
                  <Progress value={metrics.averageReplyRate * 20} className="h-2" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Click Rate</span>
                    <span className="font-medium">{metrics.averageClickRate}%</span>
                  </div>
                  <Progress value={metrics.averageClickRate * 12.5} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Campaign Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Status</CardTitle>
                <CardDescription>Distribution of campaign statuses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Active</span>
                    </div>
                    <span className="font-medium">{metrics.activeCampaigns}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm">Completed</span>
                    </div>
                    <span className="font-medium">{metrics.completedCampaigns}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm">Paused</span>
                    </div>
                    <span className="font-medium">{campaigns.filter(c => c.status === 'paused').length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                      <span className="text-sm">Draft</span>
                    </div>
                    <span className="font-medium">{campaigns.filter(c => c.status === 'draft').length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Campaign</DialogTitle>
            <DialogDescription>
              Update your campaign details and settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Campaign Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-status">Status</Label>
              <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-startDate">Start Date</Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="edit-endDate">End Date</Label>
                <Input
                  id="edit-endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCampaign}>
              Update Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Campaign Details</DialogTitle>
            <DialogDescription>
              Detailed view of campaign performance and metrics
            </DialogDescription>
          </DialogHeader>
          {selectedCampaign && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{selectedCampaign.name}</h3>
                      {selectedCampaign.description && (
                        <p className="text-muted-foreground mt-1">{selectedCampaign.description}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-muted-foreground">Status</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`${
                            selectedCampaign.status === 'active' ? 'bg-green-500' :
                            selectedCampaign.status === 'completed' ? 'bg-blue-500' :
                            selectedCampaign.status === 'paused' ? 'bg-yellow-500' : 'bg-gray-500'
                          } text-white`}>
                            {selectedCampaign.status}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Performance</Label>
                        <div className="mt-1">
                          <Badge className={`${
                            selectedCampaign.performance === 'excellent' ? 'bg-green-500/20 text-green-400' :
                            selectedCampaign.performance === 'good' ? 'bg-blue-500/20 text-blue-400' :
                            selectedCampaign.performance === 'average' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {selectedCampaign.performance}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-muted-foreground">Contacts</Label>
                        <p className="font-medium text-lg">{selectedCampaign.contactCount}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Sent</Label>
                        <p className="font-medium text-lg">{selectedCampaign.sentCount}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Open Rate</Label>
                        <p className="font-medium text-lg">{selectedCampaign.openRate}%</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Reply Rate</Label>
                        <p className="font-medium text-lg">{selectedCampaign.replyRate}%</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <CampaignProgressTracker
                      campaign={selectedCampaign}
                      totalContacts={selectedCampaign.contactCount || 0}
                      sentCount={selectedCampaign.sentCount || 0}
                      openedCount={Math.floor((selectedCampaign.sentCount || 0) * (selectedCampaign.openRate || 0) / 100)}
                      repliedCount={Math.floor((selectedCampaign.sentCount || 0) * (selectedCampaign.replyRate || 0) / 100)}
                    />
                  </div>
                </div>

                <Separator />

                {/* Insights Section */}
                {selectedCampaign.insights && selectedCampaign.insights.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-3">AI Insights</h4>
                    <div className="space-y-2">
                      {selectedCampaign.insights.map((insight: string, index: number) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-blue-500/10 rounded-lg">
                          <Check className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-blue-200">{insight}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Optimal Send Time */}
                {selectedCampaign.optimalSendTime && (
                  <div>
                    <h4 className="font-semibold mb-3">Optimal Send Time</h4>
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <p className="text-sm text-green-200">
                        Best performance on <span className="font-medium">{selectedCampaign.optimalSendTime.day}s</span> at{' '}
                        <span className="font-medium">{selectedCampaign.optimalSendTime.hour}:00</span>
                      </p>
                    </div>
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground">Created</Label>
                    <p className="font-medium">
                      {selectedCampaign.createdAt ? format(new Date(selectedCampaign.createdAt), 'PPP') : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Start Date</Label>
                    <p className="font-medium">
                      {selectedCampaign.startDate ? format(new Date(selectedCampaign.startDate), 'PPP') : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">End Date</Label>
                    <p className="font-medium">
                      {selectedCampaign.endDate ? format(new Date(selectedCampaign.endDate), 'PPP') : 'Not set'}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Close
            </Button>
            {selectedCampaign && (
              <Button onClick={() => {
                openEditDialog(selectedCampaign);
                setShowDetailsDialog(false);
              }}>
                Edit Campaign
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
