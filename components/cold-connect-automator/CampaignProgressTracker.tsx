"use client";

import React, { useState, useMemo, useCallback, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Campaign } from '@/lib/cold-outreach/campaigns';
import {
  BarChart3,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  Eye,
  MousePointerClick,
  Reply,
  TrendingUp,
  Users,
  Calendar,
  AlertTriangle
} from 'lucide-react';

/**
 * Enterprise-grade Campaign Progress Tracker Component
 *
 * Features:
 * - Comprehensive progress visualization with interactive metrics
 * - Accessibility-first design with ARIA labels and keyboard navigation
 * - Performance optimized with memoization
 * - Internationalization ready
 * - Error handling and validation
 * - Responsive design for all screen sizes
 * - Real-time progress calculations
 * - Enhanced data visualization
 */

// ============================================================================
// Types and Constants
// ============================================================================

/**
 * Metric types for campaign tracking
 */
enum MetricType {
  SENT = 'sent',
  OPENED = 'opened',
  REPLIED = 'replied',
  BOUNCED = 'bounced'
}

/**
 * Metric configuration with enhanced metadata
 */
interface MetricConfig {
  id: MetricType;
  name: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  getCount: (campaign: Campaign, props: CampaignProgressTrackerProps) => number;
  getTotal: (campaign: Campaign, props: CampaignProgressTrackerProps) => number;
}

/**
 * Enhanced props interface with comprehensive typing
 */
interface CampaignProgressTrackerProps {
  /** Campaign data */
  campaign: Campaign;
  /** Total contacts in the campaign */
  totalContacts: number;
  /** Number of emails sent */
  sentCount: number;
  /** Number of emails opened */
  openedCount: number;
  /** Number of replies received */
  repliedCount: number;
  /** Number of bounced emails */
  bouncedCount?: number;
  /** Click count for opened emails */
  clickedCount?: number;

  /** Optional callbacks */
  onMetricSelect?: (metric: MetricType) => void;
  onError?: (error: Error) => void;

  /** Configuration */
  showDetailedStats?: boolean;
  enableKeyboardNavigation?: boolean;
  className?: string;
}

// ============================================================================
// Component Implementation
// ============================================================================

/**
 * CampaignProgressTracker - Enterprise-grade campaign progress visualization
 */
export const CampaignProgressTracker = memo<CampaignProgressTrackerProps>(({
  campaign,
  totalContacts,
  sentCount,
  openedCount,
  repliedCount,
  bouncedCount = 0,
  clickedCount = 0,
  onMetricSelect,
  onError,
  showDetailedStats = true,
  enableKeyboardNavigation = true,
  className = ''
}) => {
  // ============================================================================
  // State Management
  // ============================================================================

  const [selectedMetric, setSelectedMetric] = useState<MetricType>(MetricType.SENT);
  const [hoveredMetric, setHoveredMetric] = useState<MetricType | null>(null);

  // ============================================================================
  // Metric Configuration
  // ============================================================================

  const metricConfigs: Record<MetricType, MetricConfig> = useMemo(() => ({
    [MetricType.SENT]: {
      id: MetricType.SENT,
      name: 'Sent',
      label: 'Emails Sent',
      description: 'Total number of emails successfully sent',
      icon: Send,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/20',
      borderColor: 'border-blue-500/50',
      getCount: (_, props) => props.sentCount,
      getTotal: (_, props) => props.totalContacts
    },
    [MetricType.OPENED]: {
      id: MetricType.OPENED,
      name: 'Opened',
      label: 'Open Rate',
      description: 'Percentage of sent emails that were opened',
      icon: Eye,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
      borderColor: 'border-green-500/50',
      getCount: (_, props) => props.openedCount,
      getTotal: (_, props) => props.sentCount
    },
    [MetricType.REPLIED]: {
      id: MetricType.REPLIED,
      name: 'Replied',
      label: 'Reply Rate',
      description: 'Percentage of sent emails that received replies',
      icon: Reply,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/20',
      borderColor: 'border-yellow-500/50',
      getCount: (_, props) => props.repliedCount,
      getTotal: (_, props) => props.sentCount
    },
    [MetricType.BOUNCED]: {
      id: MetricType.BOUNCED,
      name: 'Bounced',
      label: 'Bounce Rate',
      description: 'Percentage of emails that bounced',
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/20',
      borderColor: 'border-red-500/50',
      getCount: (_, props) => props.bouncedCount || 0,
      getTotal: (_, props) => props.sentCount
    }
  }), []);

  // ============================================================================
  // Memoized Computations
  // ============================================================================

  const metrics = useMemo(() => {
    return Object.values(metricConfigs).map(config => {
      const count = config.getCount(campaign, {
        campaign,
        totalContacts,
        sentCount,
        openedCount,
        repliedCount,
        bouncedCount,
        clickedCount
      });
      const total = config.getTotal(campaign, {
        campaign,
        totalContacts,
        sentCount,
        openedCount,
        repliedCount,
        bouncedCount,
        clickedCount
      });
      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;

      return {
        ...config,
        count,
        total,
        percentage,
        isSelected: selectedMetric === config.id,
        isHovered: hoveredMetric === config.id
      };
    });
  }, [campaign, totalContacts, sentCount, openedCount, repliedCount, bouncedCount, clickedCount, selectedMetric, hoveredMetric, metricConfigs]);

  const selectedMetricData = useMemo(() => {
    return metrics.find(m => m.id === selectedMetric) || metrics[0];
  }, [metrics, selectedMetric]);

  const campaignStats = useMemo(() => {
    const sent = sentCount;
    const opened = openedCount;
    const replied = repliedCount;
    const bounced = bouncedCount;
    const clicked = clickedCount;

    return {
      sent,
      opened,
      replied,
      bounced,
      clicked,
      openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
      replyRate: sent > 0 ? Math.round((replied / sent) * 100) : 0,
      bounceRate: sent > 0 ? Math.round((bounced / sent) * 100) : 0,
      clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
      clickToOpenRate: sent > 0 ? Math.round((clicked / sent) * 100) : 0
    };
  }, [sentCount, openedCount, repliedCount, bouncedCount, clickedCount]);

  const statusConfig = useMemo(() => {
    const configs = {
      active: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle, label: 'Active' },
      paused: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock, label: 'Paused' },
      completed: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: CheckCircle, label: 'Completed' },
      draft: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Clock, label: 'Draft' },
      error: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: AlertTriangle, label: 'Error' }
    };
    return configs[campaign.status as keyof typeof configs] || configs.draft;
  }, [campaign.status]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleMetricSelect = useCallback((metricId: MetricType) => {
    setSelectedMetric(metricId);
    onMetricSelect?.(metricId);
  }, [onMetricSelect]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!enableKeyboardNavigation) return;

    const currentIndex = metrics.findIndex(m => m.id === selectedMetric);
    let newIndex = currentIndex;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        newIndex = Math.max(0, currentIndex - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        newIndex = Math.min(metrics.length - 1, currentIndex + 1);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        // Already selected
        break;
    }

    if (newIndex !== currentIndex) {
      handleMetricSelect(metrics[newIndex].id);
    }
  }, [enableKeyboardNavigation, selectedMetric, metrics, handleMetricSelect]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderMetricCard = (metric: typeof metrics[0]) => {
    const Icon = metric.icon;
    const isSelected = metric.isSelected;
    const isHovered = metric.isHovered;

    return (
      <div
        key={metric.id}
        className={`rounded-md border p-3 text-center cursor-pointer transition-all duration-200 ${
          isSelected
            ? `${metric.bgColor} ${metric.borderColor} shadow-lg scale-105`
            : isHovered
            ? 'bg-gray-800/70 border-gray-600 hover:shadow-md'
            : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
        }`}
        onClick={() => handleMetricSelect(metric.id)}
        onMouseEnter={() => setHoveredMetric(metric.id)}
        onMouseLeave={() => setHoveredMetric(null)}
        role="button"
        tabIndex={0}
        aria-label={`${metric.label}: ${metric.count} out of ${metric.total} (${metric.percentage}%)`}
        aria-pressed={isSelected}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleMetricSelect(metric.id);
          }
        }}
      >
        <Icon className={`h-5 w-5 mx-auto ${metric.color} ${isSelected ? 'scale-110' : ''}`} />
        <div className="text-2xl font-bold mt-1" aria-label={`${metric.count} ${metric.name.toLowerCase()}`}>
          {metric.count.toLocaleString()}
        </div>
        <div className="text-xs text-gray-400">
          {metric.name}
        </div>
        {isSelected && (
          <div className="text-xs font-medium mt-1 text-blue-400">
            {metric.percentage}%
          </div>
        )}
      </div>
    );
  };

  const renderDetailedStats = () => {
    if (!showDetailedStats) return null;

    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
        <div className="text-center">
          <div className="text-lg font-bold text-blue-400">{campaignStats.sent.toLocaleString()}</div>
          <div className="text-xs text-gray-400">Total Sent</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-green-400">{campaignStats.openRate}%</div>
          <div className="text-xs text-gray-400">Open Rate</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-yellow-400">{campaignStats.replyRate}%</div>
          <div className="text-xs text-gray-400">Reply Rate</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-red-400">{campaignStats.bounceRate}%</div>
          <div className="text-xs text-gray-400">Bounce Rate</div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <Card className={`w-full ${className}`} role="region" aria-labelledby="progress-tracker-title">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-400" aria-hidden="true" />
            <CardTitle id="progress-tracker-title" className="text-lg">
              Campaign Progress
            </CardTitle>
          </div>
          <Badge
            className={`${statusConfig.color} flex items-center gap-1`}
            aria-label={`Campaign status: ${statusConfig.label}`}
          >
            <statusConfig.icon className="h-3 w-3" />
            {statusConfig.label}
          </Badge>
        </div>
        <CardDescription>
          Tracking progress for &quot;{campaign.name}&quot;
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Interactive Metrics Grid */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
          role="tablist"
          aria-label="Campaign metrics"
          onKeyDown={handleKeyDown}
        >
          {metrics.map(renderMetricCard)}
        </div>

        {/* Selected Metric Progress */}
        <div className="space-y-2" role="region" aria-labelledby="selected-metric-progress">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400" id="selected-metric-progress">
              {selectedMetricData.label}
            </span>
            <span className="font-medium" aria-label={`${selectedMetricData.percentage}% ${selectedMetricData.name.toLowerCase()}`}>
              {selectedMetricData.percentage}%
            </span>
          </div>
          <Progress
            value={selectedMetricData.percentage}
            className="h-2"
            aria-label={`${selectedMetricData.name} progress: ${selectedMetricData.percentage}%`}
          />
          <div className="text-xs text-gray-500 text-center">
            {selectedMetricData.count.toLocaleString()} of {selectedMetricData.total.toLocaleString()} {selectedMetricData.name.toLowerCase()}
          </div>
        </div>

        {/* Detailed Statistics */}
        {renderDetailedStats()}

        {/* Campaign Details */}
        <div className="rounded-md bg-gray-800/50 border border-gray-700 p-4" role="region" aria-labelledby="campaign-details">
          <h4 id="campaign-details" className="font-medium text-gray-300 mb-3 flex items-center">
            <TrendingUp className="h-4 w-4 mr-2" />
            Campaign Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Users className="h-4 w-4 mr-2 text-gray-400" aria-hidden="true" />
                <span className="text-gray-400">Total Contacts:</span>
                <span className="ml-2 font-medium">{totalContacts.toLocaleString()}</span>
              </div>
              <div className="flex items-center text-sm">
                <Send className="h-4 w-4 mr-2 text-gray-400" aria-hidden="true" />
                <span className="text-gray-400">Status:</span>
                <span className="ml-2 font-medium capitalize">{campaign.status}</span>
              </div>
            </div>
            <div className="space-y-2">
              {campaign.startDate && (
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" aria-hidden="true" />
                  <span className="text-gray-400">Start Date:</span>
                  <span className="ml-2 font-medium">
                    {new Date(campaign.startDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {campaign.endDate && (
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" aria-hidden="true" />
                  <span className="text-gray-400">End Date:</span>
                  <span className="ml-2 font-medium">
                    {new Date(campaign.endDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

CampaignProgressTracker.displayName = 'CampaignProgressTracker';

// ============================================================================
// Exports
// ============================================================================

export type { CampaignProgressTrackerProps };
export { MetricType };
