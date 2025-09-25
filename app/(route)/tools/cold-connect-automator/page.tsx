"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import {
  Mail,
  Users,
  FileText,
  BarChart3,
  Database,
  Home,
  ArrowRight,
  TrendingUp,
  Zap,
  Target,
  Clock,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Shield,
  Settings,
  Activity,
  Calendar,
  MessageSquare,
  Send,
  Eye,
  Star,
  Award,
  ThumbsUp,
  PlayCircle,
  PauseCircle,
  MoreHorizontal
} from 'lucide-react';

interface DashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalContacts: number;
  emailsSent: number;
  openRate: number;
  clickRate: number;
  replyRate: number;
  conversionRate: number;
}

interface RecentActivity {
  id: string;
  type: 'campaign_created' | 'emails_sent' | 'contact_added' | 'template_used';
  description: string;
  timestamp: Date;
  status?: 'success' | 'warning' | 'error';
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: any;
  href: string;
  color: string;
  badge?: string;
  disabled?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'campaigns',
    title: 'Campaigns',
    description: 'Create and manage automated outreach campaigns',
    icon: Mail,
    href: '/tools/cold-connect-automator/campaigns',
    color: 'bg-blue-500/20 text-blue-400',
    badge: 'Advanced'
  },
  {
    id: 'contacts',
    title: 'Contacts',
    description: 'Import and manage your prospect database',
    icon: Users,
    href: '/tools/cold-connect-automator/contacts',
    color: 'bg-green-500/20 text-green-400',
    badge: 'Real-time'
  },
  {
    id: 'templates',
    title: 'Templates',
    description: 'Design professional email templates',
    icon: FileText,
    href: '/tools/cold-connect-automator/templates',
    color: 'bg-purple-500/20 text-purple-400',
    badge: 'AI-Powered'
  },
  {
    id: 'analytics',
    title: 'Analytics',
    description: 'Track performance and optimize results',
    icon: BarChart3,
    href: '/tools/cold-connect-automator/analytics',
    color: 'bg-orange-500/20 text-orange-400',
    badge: 'Insights'
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Configure integrations and preferences',
    icon: Settings,
    href: '/tools/cold-connect-automator/settings',
    color: 'bg-gray-500/20 text-gray-400'
  }
];

const MetricCard = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  loading = false,
  subtitle
}: {
  title: string;
  value: string;
  change?: string;
  icon: any;
  color: string;
  loading?: boolean;
  subtitle?: string;
}) => (
  <Card className="hover:shadow-md transition-shadow">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <Skeleton className="h-8 w-16 mt-1" />
          ) : (
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl font-bold">{value}</p>
              {change && (
                <span className={`text-sm ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {change}
                </span>
              )}
            </div>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const ActivityItem = ({ activity }: { activity: RecentActivity }) => {
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (type: string) => {
    switch (type) {
      case 'campaign_created': return <Mail className="h-4 w-4" />;
      case 'emails_sent': return <Send className="h-4 w-4" />;
      case 'contact_added': return <Users className="h-4 w-4" />;
      case 'template_used': return <FileText className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className={`p-2 rounded-full bg-muted ${getStatusColor(activity.status)}`}>
        {getStatusIcon(activity.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{activity.description}</p>
        <p className="text-xs text-muted-foreground">
          {activity.timestamp.toLocaleString()}
        </p>
      </div>
      {activity.status && (
        <Badge variant="outline" className={`text-xs ${getStatusColor(activity.status)}`}>
          {activity.status}
        </Badge>
      )}
    </div>
  );
};

export default function ColdConnectAutomatorPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user?.id) {
      router.push('/signin');
      return;
    }

    fetchDashboardData();
    fetchActivities();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchDashboardData();
      fetchActivities();
    }, 30000);

    return () => clearInterval(interval);
  }, [session, status, router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsResponse, campaignsResponse] = await Promise.all([
        fetch('/api/cold-outreach/dashboard/stats'),
        fetch('/api/cold-outreach/campaigns?status=active&limit=5')
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.stats);
      }

      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json();
        setActiveCampaigns(campaignsData.campaigns || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Don't show error toast for dashboard data as it's not critical
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/cold-outreach/dashboard/activities?limit=10');
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  const handleQuickStart = () => {
    router.push('/tools/cold-connect-automator/campaigns?create=1');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  if (status === 'loading' || loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground">
            Cold connect automator
          </h1>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mt-1">
            {getGreeting()}, {session?.user?.name?.split(' ')[0] || 'there'}!
          </h2>
          <p className="text-muted-foreground mt-2">
            Welcome to your enterprise cold outreach automation dashboard
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={fetchDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleQuickStart} size="lg">
            <Sparkles className="h-4 w-4 mr-2" />
            Quick Start Campaign
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Campaigns"
          value={stats?.totalCampaigns.toString() || '0'}
          change="+12%"
          icon={Mail}
          color="bg-blue-500/20 text-blue-400"
          loading={!stats}
          subtitle="Active this month"
        />
        <MetricCard
          title="Contacts Reached"
          value={stats?.totalContacts.toString() || '0'}
          change="+8%"
          icon={Users}
          color="bg-green-500/20 text-green-400"
          loading={!stats}
          subtitle="In your database"
        />
        <MetricCard
          title="Emails Sent"
          value={stats?.emailsSent.toString() || '0'}
          change="+15%"
          icon={Send}
          color="bg-purple-500/20 text-purple-400"
          loading={!stats}
          subtitle="This week"
        />
        <MetricCard
          title="Avg Open Rate"
          value={`${stats?.openRate.toFixed(1) || '0'}%`}
          change="+2.3%"
          icon={TrendingUp}
          color="bg-orange-500/20 text-orange-400"
          loading={!stats}
          subtitle="Above industry avg"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Quick Actions
              </CardTitle>
              <CardDescription>
                Access all your cold outreach tools and features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {QUICK_ACTIONS.map((action) => (
                  <Link key={action.id} href={action.href}>
                    <Card className="hover:shadow-md transition-all duration-200 hover:scale-105 cursor-pointer group">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`p-3 rounded-lg ${action.color} group-hover:scale-110 transition-transform`}>
                            <action.icon className="h-6 w-6" />
                          </div>
                          {action.badge && (
                            <Badge variant="secondary" className="text-xs">
                              {action.badge}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors">
                          {action.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          {action.description}
                        </p>
                        <div className="flex items-center text-sm text-primary group-hover:text-primary/80">
                          Get started
                          <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Active Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5" />
                Active Campaigns
              </CardTitle>
              <CardDescription>
                Monitor your running outreach campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeCampaigns.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Campaigns</h3>
                  <p className="text-muted-foreground mb-6">
                    Start your first campaign to begin automated outreach
                  </p>
                  <Button onClick={handleQuickStart}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeCampaigns.map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{campaign.name}</h4>
                          <Badge variant="outline" className="text-green-400">
                            <PlayCircle className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          <span>{campaign.contactsCount || 0} contacts</span>
                          <span>{campaign.emailsSent || 0} sent</span>
                          <span>{campaign.openRate?.toFixed(1) || 0}% open rate</span>
                        </div>
                        <Progress value={campaign.progress || 0} className="h-2" />
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <PauseCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="text-center pt-4">
                    <Link href="/tools/cold-connect-automator/campaigns">
                      <Button variant="outline">
                        View All Campaigns
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Performance Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Open Rate</span>
                  <div className="flex items-center gap-2">
                    <Progress value={stats?.openRate || 0} className="w-16 h-2" />
                    <span className="text-sm font-semibold">{stats?.openRate.toFixed(1) || 0}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Click Rate</span>
                  <div className="flex items-center gap-2">
                    <Progress value={stats?.clickRate || 0} className="w-16 h-2" />
                    <span className="text-sm font-semibold">{stats?.clickRate.toFixed(1) || 0}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Reply Rate</span>
                  <div className="flex items-center gap-2">
                    <Progress value={stats?.replyRate || 0} className="w-16 h-2" />
                    <span className="text-sm font-semibold">{stats?.replyRate.toFixed(1) || 0}%</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Conversion Rate</span>
                  <div className="flex items-center gap-2">
                    <Progress value={stats?.conversionRate || 0} className="w-16 h-2" />
                    <span className="text-sm font-semibold">{stats?.conversionRate.toFixed(1) || 0}%</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Award className="h-4 w-4" />
                  <span>Above industry average</span>
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
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {activities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ThumbsUp className="h-5 w-5" />
                Pro Tips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Personalize at Scale</p>
                  <p className="text-xs text-muted-foreground">Use AI templates with recipient data for 40% higher response rates</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Follow-up Sequences</p>
                  <p className="text-xs text-muted-foreground">Set up automated follow-ups 3-5 days after initial contact</p>
                </div>
              </div>
              <div className="flex gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">A/B Test Subjects</p>
                  <p className="text-xs text-muted-foreground">Test different subject lines to optimize open rates</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Getting Started Guide */}
      {(!stats || stats.totalCampaigns === 0) && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Getting Started
            </CardTitle>
            <CardDescription>
              Follow these steps to launch your first cold outreach campaign
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-lg font-bold text-primary">1</span>
                </div>
                <h3 className="font-semibold mb-2">Import Contacts</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Upload your prospect list via CSV or connect your CRM
                </p>
                <Link href="/tools/cold-connect-automator/contacts">
                  <Button variant="outline" size="sm">
                    Import Contacts
                  </Button>
                </Link>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-lg font-bold text-primary">2</span>
                </div>
                <h3 className="font-semibold mb-2">Create Templates</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Design professional email templates with personalization
                </p>
                <Link href="/tools/cold-connect-automator/templates">
                  <Button variant="outline" size="sm">
                    Create Templates
                  </Button>
                </Link>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-lg font-bold text-primary">3</span>
                </div>
                <h3 className="font-semibold mb-2">Launch Campaign</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Set up automated sequences and start reaching prospects
                </p>
                <Button size="sm" onClick={handleQuickStart}>
                  Launch Campaign
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
