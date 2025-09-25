"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Mail,
  Eye,
  MousePointerClick,
  Reply,
  AlertCircle,
  Download,
  RefreshCw,
  Calendar,
  Filter,
  Target,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react';
import { CampaignProgressTracker } from '@/components/cold-connect-automator/CampaignProgressTracker';
import { getCampaignsByUserId } from '@/lib/cold-outreach/campaigns';
import { getContactsByUserId } from '@/lib/cold-outreach/contacts';
import { Campaign } from '@/lib/cold-outreach/campaigns';
import { Contact } from '@/lib/cold-outreach/contacts';
import { DateRange } from 'react-day-picker';
import { addDays, format, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

interface AnalyticsData {
  totalContacts: number;
  totalCampaigns: number;
  activeCampaigns: number;
  totalEmailsSent: number;
  totalEmailsOpened: number;
  totalEmailsReplied: number;
  averageOpenRate: number;
  averageReplyRate: number;
  campaigns: Campaign[];
  contacts: Contact[];
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: 'campaign_created' | 'email_sent' | 'email_opened' | 'email_replied' | 'contact_added';
  description: string;
  timestamp: Date;
  campaignId?: string;
  contactId?: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  isLoading?: boolean;
  'aria-label'?: string;
}

function MetricCard({ title, value, change, changeLabel, icon: Icon, color, bgColor, isLoading, 'aria-label': ariaLabel }: MetricCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200" aria-label={ariaLabel}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</p>
              {change !== undefined && (
                <div className={`flex items-center text-sm ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {change >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                  <span>{Math.abs(change)}%</span>
                </div>
              )}
            </div>
            {changeLabel && (
              <p className="text-xs text-muted-foreground">{changeLabel}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${bgColor}`}>
            <Icon className={`h-6 w-6 ${color}`} aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(addDays(new Date(), -30)),
    to: endOfDay(new Date()),
  });
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('overview');

  // Cleanup flag for useEffect
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadAnalyticsData = useCallback(async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) setRefreshing(true);
      else setLoading(true);

      setError(null);

      // Build API URL with filters
      const params = new URLSearchParams();
      if (dateRange?.from) {
        params.append('startDate', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        params.append('endDate', dateRange.to.toISOString());
      }
      if (selectedCampaign !== 'all') {
        params.append('campaignId', selectedCampaign);
      }
      params.append('includeAdvanced', 'true');

      const response = await fetch(`/api/cold-outreach/analytics?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Transform API response to match our interface
      const analyticsData: AnalyticsData = {
        totalContacts: data.analytics.overview.totalContacts,
        totalCampaigns: data.analytics.overview.totalCampaigns,
        activeCampaigns: data.analytics.overview.activeCampaigns,
        totalEmailsSent: data.analytics.overview.sentMessages,
        totalEmailsOpened: data.analytics.overview.openedMessages,
        totalEmailsReplied: data.analytics.overview.repliedMessages,
        averageOpenRate: data.analytics.overview.openRate,
        averageReplyRate: data.analytics.overview.replyRate,
        campaigns: data.analytics.campaignPerformance || [],
        contacts: [], // We'll fetch this separately if needed
        recentActivity: [], // Generate from campaign data
      };

      // Generate recent activity from campaign data
      const recentActivity: ActivityItem[] = [];
      data.analytics.campaignPerformance?.slice(0, 5).forEach((campaign: any) => {
        recentActivity.push({
          id: `campaign-${campaign.id}`,
          type: 'campaign_created',
          description: `Campaign "${campaign.name}" created`,
          timestamp: new Date(campaign.createdAt),
          campaignId: campaign.id
        });

        if (campaign.sentCount > 0) {
          recentActivity.push({
            id: `sent-${campaign.id}`,
            type: 'email_sent',
            description: `${campaign.sentCount} emails sent for "${campaign.name}"`,
            timestamp: new Date(campaign.createdAt),
            campaignId: campaign.id
          });
        }
      });

      analyticsData.recentActivity = recentActivity.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      if (isMountedRef.current) {
        setAnalyticsData(analyticsData);
      }
    } catch (err) {
      console.error('Failed to load analytics data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analytics data. Please try again.';
      if (isMountedRef.current) {
        setError(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [session?.user?.id, router, dateRange?.from, dateRange?.to, selectedCampaign, toast]);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user?.id) {
      router.push('/signin');
      return;
    }

    loadAnalyticsData();
  }, [status, session?.user?.id, router, loadAnalyticsData]);

  const handleRefresh = () => {
    loadAnalyticsData(true);
  };

  const handleExportData = () => {
    if (!analyticsData) return;

    const exportData = {
      summary: {
        totalContacts: analyticsData.totalContacts,
        totalCampaigns: analyticsData.totalCampaigns,
        activeCampaigns: analyticsData.activeCampaigns,
        totalEmailsSent: analyticsData.totalEmailsSent,
        totalEmailsOpened: analyticsData.totalEmailsOpened,
        totalEmailsReplied: analyticsData.totalEmailsReplied,
        averageOpenRate: analyticsData.averageOpenRate,
        averageReplyRate: analyticsData.averageReplyRate,
        dateRange: dateRange ? {
          from: dateRange.from?.toISOString(),
          to: dateRange.to?.toISOString()
        } : null
      },
      campaigns: analyticsData.campaigns.map(c => ({
        id: c.id,
        name: c.name,
        status: c.status,
        sentCount: c.sentCount,
        openedCount: c.openedCount,
        repliedCount: c.repliedCount,
        createdAt: c.createdAt && c.createdAt instanceof Date && !isNaN(c.createdAt.getTime()) ? c.createdAt.toISOString() : null      })),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cold-connect-analytics-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Analytics data has been exported successfully",
    });
  };

  const filteredCampaigns = useMemo(() => {
    if (!analyticsData) return [];
    return analyticsData.campaigns.filter(campaign => {
      if (selectedCampaign === 'all') return true;
      return campaign.id === selectedCampaign;
    });
  }, [analyticsData, selectedCampaign]);

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <MetricCard
              key={i}
              title=""
              value=""
              icon={BarChart3}
              color=""
              bgColor=""
              isLoading={true}
            />
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!session?.user?.id) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>You need to be logged in to view analytics.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/signin')} className="w-full">
              Sign In
            </Button>
          </CardContent>
        </Card>
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track your cold outreach performance and campaign metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleExportData}
            disabled={!analyticsData}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="flex-1 min-w-0">
                <Select
                  value={dateRange ? 'custom' : '30d'}
                  onValueChange={(value) => {
                    if (value === '7d') {
                      setDateRange({ from: addDays(new Date(), -7), to: new Date() });
                    } else if (value === '30d') {
                      setDateRange({ from: addDays(new Date(), -30), to: new Date() });
                    } else if (value === '90d') {
                      setDateRange({ from: addDays(new Date(), -90), to: new Date() });
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="All Campaigns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {analyticsData?.campaigns.map((campaign) => (
                    <SelectItem
                      key={campaign.id ? campaign.id : `campaign-${campaign.name ?? 'unknown'}`}
                       value={campaign.id || ''}
                    >
                      {campaign.name}
                    </SelectItem>
                  ))}                
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Contacts"
          value={analyticsData?.totalContacts || 0}
          change={12}
          changeLabel="from last month"
          icon={Users}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <MetricCard
          title="Active Campaigns"
          value={analyticsData?.activeCampaigns || 0}
          change={8}
          changeLabel="from last month"
          icon={Target}
          color="text-green-600"
          bgColor="bg-green-100"
        />
        <MetricCard
          title="Emails Sent"
          value={analyticsData?.totalEmailsSent || 0}
          change={15}
          changeLabel="from last month"
          icon={Mail}
          color="text-purple-600"
          bgColor="bg-purple-100"
        />
        <MetricCard
          title="Avg. Open Rate"
          value={`${analyticsData?.averageOpenRate || 0}%`}
          change={5}
          changeLabel="from last month"
          icon={Eye}
          color="text-orange-600"
          bgColor="bg-orange-100"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Campaign Performance Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Campaign Performance
                </CardTitle>
                <CardDescription>
                  Overall campaign metrics and KPIs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Open Rate</span>
                    <span className="text-sm font-bold">{analyticsData?.averageOpenRate || 0}%</span>
                  </div>
                  <Progress value={analyticsData?.averageOpenRate || 0} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Reply Rate</span>
                    <span className="text-sm font-bold">{analyticsData?.averageReplyRate || 0}%</span>
                  </div>
                  <Progress value={analyticsData?.averageReplyRate || 0} className="h-2" />
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {analyticsData?.totalEmailsOpened || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Opened</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {analyticsData?.totalEmailsReplied || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Replied</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {analyticsData?.totalEmailsSent || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Sent</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest updates from your campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analyticsData?.recentActivity.length ? (
                    analyticsData.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-muted">
                          {activity.type === 'campaign_created' && <Target className="h-4 w-4" />}
                          {activity.type === 'email_sent' && <Mail className="h-4 w-4" />}
                          {activity.type === 'email_opened' && <Eye className="h-4 w-4" />}
                          {activity.type === 'email_replied' && <Reply className="h-4 w-4" />}
                          {activity.type === 'contact_added' && <Users className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm">{activity.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(activity.timestamp, 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No recent activity</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <div className="grid gap-6">
            {filteredCampaigns.length > 0 ? (
              filteredCampaigns.map((campaign) => (
                <CampaignProgressTracker
                  key={campaign.id}
                  campaign={campaign}
                  totalContacts={analyticsData?.totalContacts || 0}
                  sentCount={campaign.sentCount || 0}
                  openedCount={campaign.openedCount || 0}
                  repliedCount={campaign.repliedCount || 0}
                />
              ))
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No campaigns found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {selectedCampaign === 'all'
                      ? 'Create your first campaign to start tracking performance.'
                      : 'No campaigns match the selected filters.'
                    }
                  </p>
                  <Button onClick={() => router.push('/tools/cold-connect-automator/campaigns')}>
                    Create Campaign
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>
                  Detailed breakdown of your outreach performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Sent</span>
                      <span className="font-medium">{analyticsData?.totalEmailsSent || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Opened</span>
                      <span className="font-medium">{analyticsData?.totalEmailsOpened || 0}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Total Replied</span>
                      <span className="font-medium">{analyticsData?.totalEmailsReplied || 0}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Open Rate</span>
                      <span className="font-medium">{analyticsData?.averageOpenRate || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Reply Rate</span>
                      <span className="font-medium">{analyticsData?.averageReplyRate || 0}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Bounce Rate</span>
                      <span className="font-medium">0%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Campaign Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Campaign Status</CardTitle>
                <CardDescription>
                  Distribution of campaign statuses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { status: 'active', label: 'Active', count: analyticsData?.activeCampaigns || 0, color: 'bg-green-500' },
                    { status: 'completed', label: 'Completed', count: (analyticsData?.totalCampaigns || 0) - (analyticsData?.activeCampaigns || 0), color: 'bg-blue-500' },
                    { status: 'draft', label: 'Draft', count: 0, color: 'bg-gray-500' },
                    { status: 'paused', label: 'Paused', count: 0, color: 'bg-yellow-500' }
                  ].map(({ status, label, count, color }) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${color}`} />
                        <span className="text-sm font-medium">{label}</span>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Activity Timeline
              </CardTitle>
              <CardDescription>
                Complete timeline of all campaign activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analyticsData?.recentActivity.length ? (
                  analyticsData.recentActivity.map((activity, index) => (
                    <div key={activity.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="p-2 rounded-full bg-primary/10">
                          {activity.type === 'campaign_created' && <Target className="h-4 w-4 text-primary" />}
                          {activity.type === 'email_sent' && <Mail className="h-4 w-4 text-primary" />}
                          {activity.type === 'email_opened' && <Eye className="h-4 w-4 text-primary" />}
                          {activity.type === 'email_replied' && <Reply className="h-4 w-4 text-primary" />}
                          {activity.type === 'contact_added' && <Users className="h-4 w-4 text-primary" />}
                        </div>
                        {index < (analyticsData.recentActivity.length - 1) && (
                          <div className="w-px h-8 bg-border mt-2" />
                        )}
                      </div>
                      <div className="flex-1 pb-8">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{activity.description}</h4>
                          <time className="text-sm text-muted-foreground">
                            {format(activity.timestamp, 'MMM d, yyyy h:mm a')}
                          </time>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {activity.type === 'campaign_created' && 'A new campaign was created and configured'}
                          {activity.type === 'email_sent' && 'Emails were sent to contacts in this campaign'}
                          {activity.type === 'email_opened' && 'Contacts opened emails from this campaign'}
                          {activity.type === 'email_replied' && 'Contacts replied to emails from this campaign'}
                          {activity.type === 'contact_added' && 'New contacts were added to the database'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No activity recorded yet</p>
                    <p className="text-sm mt-2">Activity will appear here as you run campaigns</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
