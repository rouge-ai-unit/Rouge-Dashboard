"use client";

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Mail,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  Pause,
  Play,
  AlertTriangle,
  Loader2,
  Send,
  MailCheck,
  MailX,
  Timer,
  Zap
} from 'lucide-react';

// ============================================================================
// Types and Interfaces
// ============================================================================

export enum EmailSendingStatus {
  IDLE = 'idle',
  SENDING = 'sending',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

export interface EmailError {
  /** Email address that failed */
  email: string;
  /** Error message */
  error: string;
  /** Timestamp of the error */
  timestamp: Date;
  /** Error code if available */
  code?: string;
  /** Retry count for this email */
  retryCount?: number;
}

export interface EmailSendingNotificationProps {
  /** Current sending status */
  status: EmailSendingStatus;
  /** Total number of emails to send */
  totalEmails: number;
  /** Number of emails successfully sent */
  sentCount: number;
  /** Number of emails that failed to send */
  failedCount: number;
  /** Number of emails currently paused/queued */
  pausedCount: number;
  /** Current batch number being processed */
  currentBatch: number;
  /** Total number of batches */
  totalBatches: number;
  /** Array of email sending errors */
  errors: EmailError[];
  /** Callback when user pauses sending */
  onPause: () => void;
  /** Callback when user resumes sending */
  onResume: () => void;
  /** Callback when user cancels sending */
  onCancel: () => void;
  /** Callback when user retries failed emails */
  onRetryFailed: () => void;
  /** Whether the component is in a loading state */
  isLoading?: boolean;
  /** Current sending rate (emails per minute) */
  sendingRate?: number;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
  /** Rate limit information */
  rateLimit?: {
    current: number;
    max: number;
    resetTime?: Date;
  };
  /** Whether to show detailed error information */
  showDetails?: boolean;
  /** Maximum number of errors to display */
  maxErrorsDisplay?: number;
  /** Custom CSS class name */
  className?: string;
}

export interface EmailSendingState {
  /** Start time of the campaign */
  startTime?: Date;
  /** End time of the campaign */
  endTime?: Date;
  /** Last progress update time */
  lastUpdateTime?: Date;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_ERRORS_DISPLAY = 5;
const PROGRESS_UPDATE_INTERVAL = 1000; // ms
const RATE_LIMIT_WARNING_THRESHOLD = 0.8; // 80% of limit

const STATUS_CONFIG = {
  [EmailSendingStatus.IDLE]: {
    icon: Mail,
    text: 'Ready',
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    ariaLabel: 'Email campaign is ready to start'
  },
  [EmailSendingStatus.SENDING]: {
    icon: Send,
    text: 'Sending',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    ariaLabel: 'Email campaign is currently sending'
  },
  [EmailSendingStatus.PAUSED]: {
    icon: Pause,
    text: 'Paused',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    ariaLabel: 'Email campaign is paused'
  },
  [EmailSendingStatus.COMPLETED]: {
    icon: CheckCircle,
    text: 'Completed',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    ariaLabel: 'Email campaign completed successfully'
  },
  [EmailSendingStatus.ERROR]: {
    icon: AlertCircle,
    text: 'Error',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    ariaLabel: 'Email campaign encountered an error'
  },
  [EmailSendingStatus.CANCELLED]: {
    icon: XCircle,
    text: 'Cancelled',
    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    ariaLabel: 'Email campaign was cancelled'
  }
};

// ============================================================================
// Error Boundary Component
// ============================================================================

interface EmailSendingErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class EmailSendingErrorBoundary extends React.Component<
  React.PropsWithChildren<object>,
  EmailSendingErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<object>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): EmailSendingErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Email Sending Notification Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="w-full border-red-500/50">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to load email sending notification. Please refresh the page.
                {this.state.error && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm">Error details</summary>
                    <pre className="mt-1 text-xs overflow-auto">
                      {this.state.error.message}
                    </pre>
                  </details>
                )}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

const formatTimeRemaining = (seconds: number): string => {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)}m`;
  return `${Math.ceil(seconds / 3600)}h`;
};

const formatSendingRate = (rate: number): string => {
  return `${rate.toFixed(1)}/min`;
};

const validateProps = (props: EmailSendingNotificationProps): string[] => {
  const errors: string[] = [];

  if (props.totalEmails < 0) {
    errors.push('Total emails cannot be negative');
  }

  if (props.sentCount < 0 || props.sentCount > props.totalEmails) {
    errors.push('Sent count must be between 0 and total emails');
  }

  if (props.failedCount < 0) {
    errors.push('Failed count cannot be negative');
  }

  if (props.pausedCount < 0) {
    errors.push('Paused count cannot be negative');
  }

  if (props.currentBatch < 0 || props.currentBatch > props.totalBatches) {
    errors.push('Current batch must be between 0 and total batches');
  }

  if (props.totalBatches < 0) {
    errors.push('Total batches cannot be negative');
  }

  if (props.estimatedTimeRemaining && props.estimatedTimeRemaining < 0) {
    errors.push('Estimated time remaining cannot be negative');
  }

  if (props.sendingRate && props.sendingRate < 0) {
    errors.push('Sending rate cannot be negative');
  }

  if (props.rateLimit) {
    if (props.rateLimit.current < 0) {
      errors.push('Rate limit current cannot be negative');
    }
    if (props.rateLimit.max <= 0) {
      errors.push('Rate limit max must be positive');
    }
  }

  return errors;
};

// ============================================================================
// Main Component
// ============================================================================

const EmailSendingNotificationComponent: React.FC<EmailSendingNotificationProps> = memo(({
  status,
  totalEmails,
  sentCount,
  failedCount,
  pausedCount,
  currentBatch,
  totalBatches,
  errors,
  onPause,
  onResume,
  onCancel,
  onRetryFailed,
  isLoading = false,
  sendingRate,
  estimatedTimeRemaining,
  rateLimit,
  showDetails = false,
  maxErrorsDisplay = DEFAULT_MAX_ERRORS_DISPLAY,
  className
}) => {
  // ============================================================================
  // State Management
  // ============================================================================

  const [sendingState, setSendingState] = useState<EmailSendingState>({});

  // ============================================================================
  // Validation
  // ============================================================================

  const validationErrors = useMemo(() => validateProps({
    status, totalEmails, sentCount, failedCount, pausedCount, currentBatch, totalBatches,
    errors, onPause, onResume, onCancel, onRetryFailed, sendingRate, estimatedTimeRemaining, rateLimit
  }), [status, totalEmails, sentCount, failedCount, pausedCount, currentBatch, totalBatches,
       errors, onPause, onResume, onCancel, onRetryFailed, sendingRate, estimatedTimeRemaining, rateLimit]);

  // ============================================================================
  // Memoized Values
  // ============================================================================

  const statusConfig = useMemo(() => STATUS_CONFIG[status], [status]);

  const progressPercentage = useMemo(() => {
    if (totalEmails === 0) return 0;
    return Math.min(100, Math.max(0, Math.round(((sentCount + failedCount) / totalEmails) * 100)));
  }, [totalEmails, sentCount, failedCount]);

  const successRate = useMemo(() => {
    const totalProcessed = sentCount + failedCount;
    return totalProcessed === 0 ? 0 : Math.round((sentCount / totalProcessed) * 100);
  }, [sentCount, failedCount]);

  const displayErrors = useMemo(() =>
    errors.slice(0, maxErrorsDisplay), [errors, maxErrorsDisplay]
  );

  const remainingErrors = useMemo(() =>
    Math.max(0, errors.length - maxErrorsDisplay), [errors.length, maxErrorsDisplay]
  );

  const formattedTimeRemaining = useMemo(() =>
    estimatedTimeRemaining ? formatTimeRemaining(estimatedTimeRemaining) : null,
    [estimatedTimeRemaining]
  );

  const formattedSendingRate = useMemo(() =>
    sendingRate ? formatSendingRate(sendingRate) : null,
    [sendingRate]
  );

  const isRateLimitNearLimit = useMemo(() =>
    rateLimit ? (rateLimit.current / rateLimit.max) >= RATE_LIMIT_WARNING_THRESHOLD : false,
    [rateLimit]
  );

  const rateLimitResetTime = useMemo(() => {
    if (!rateLimit?.resetTime) return null;
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeStyle: 'short'
      }).format(rateLimit.resetTime);
    } catch {
      return rateLimit.resetTime.toLocaleTimeString();
    }
  }, [rateLimit?.resetTime]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handlePause = useCallback(() => {
    try {
      onPause();
    } catch (error) {
      console.error('Failed to pause email sending:', error);
    }
  }, [onPause]);

  const handleResume = useCallback(() => {
    try {
      onResume();
    } catch (error) {
      console.error('Failed to resume email sending:', error);
    }
  }, [onResume]);

  const handleCancel = useCallback(() => {
    try {
      onCancel();
    } catch (error) {
      console.error('Failed to cancel email sending:', error);
    }
  }, [onCancel]);

  const handleRetryFailed = useCallback(() => {
    try {
      onRetryFailed();
    } catch (error) {
      console.error('Failed to retry failed emails:', error);
    }
  }, [onRetryFailed]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Track campaign start/end times
  useEffect(() => {
    if (status === EmailSendingStatus.SENDING && !sendingState.startTime) {
      setSendingState(prev => ({ ...prev, startTime: new Date() }));
    } else if ((status === EmailSendingStatus.COMPLETED || status === EmailSendingStatus.ERROR || status === EmailSendingStatus.CANCELLED) && sendingState.startTime && !sendingState.endTime) {
      setSendingState(prev => ({ ...prev, endTime: new Date() }));
    }
  }, [status, sendingState.startTime, sendingState.endTime]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderStatusIcon = useCallback(() => {
    const IconComponent = status === EmailSendingStatus.SENDING ? Loader2 : statusConfig.icon;

    return (
      <IconComponent
        className={`h-5 w-5 ${status === EmailSendingStatus.SENDING ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />
    );
  }, [status, statusConfig.icon]);

  const renderProgressSection = useCallback(() => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400" id="sending-progress-label">
          {status === EmailSendingStatus.SENDING ? 'Sending emails...' : statusConfig.text}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-medium">{progressPercentage}%</span>
          {formattedSendingRate && (
            <span className="text-gray-400 text-xs">
              ({formattedSendingRate})
            </span>
          )}
        </div>
      </div>
      <Progress
        value={progressPercentage}
        className="h-2"
        aria-label={`Email sending progress: ${progressPercentage}% complete`}
      />
      {status === EmailSendingStatus.SENDING && formattedTimeRemaining && (
        <div className="text-xs text-gray-400 text-right">
          Estimated time remaining: {formattedTimeRemaining}
        </div>
      )}
    </div>
  ), [status, statusConfig.text, progressPercentage, formattedSendingRate, formattedTimeRemaining]);

  const renderStatisticsGrid = useCallback(() => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3" role="list" aria-label="Email sending statistics">
      <div className="rounded-md bg-green-900/20 border border-green-500/30 p-3 text-center" role="listitem">
        <div className="text-2xl font-bold text-green-400" aria-label={`${sentCount} emails sent successfully`}>
          {sentCount.toLocaleString()}
        </div>
        <div className="text-xs text-green-300 flex items-center justify-center gap-1">
          <MailCheck className="h-3 w-3" aria-hidden="true" />
          Sent
        </div>
      </div>
      <div className="rounded-md bg-red-900/20 border border-red-500/30 p-3 text-center" role="listitem">
        <div className="text-2xl font-bold text-red-400" aria-label={`${failedCount} emails failed`}>
          {failedCount.toLocaleString()}
        </div>
        <div className="text-xs text-red-300 flex items-center justify-center gap-1">
          <MailX className="h-3 w-3" aria-hidden="true" />
          Failed
        </div>
      </div>
      <div className="rounded-md bg-yellow-900/20 border border-yellow-500/30 p-3 text-center" role="listitem">
        <div className="text-2xl font-bold text-yellow-400" aria-label={`${pausedCount} emails paused`}>
          {pausedCount.toLocaleString()}
        </div>
        <div className="text-xs text-yellow-300 flex items-center justify-center gap-1">
          <Pause className="h-3 w-3" aria-hidden="true" />
          Paused
        </div>
      </div>
      <div className="rounded-md bg-blue-900/20 border border-blue-500/30 p-3 text-center" role="listitem">
        <div className="text-2xl font-bold text-blue-400" aria-label={`${totalEmails} total emails`}>
          {totalEmails.toLocaleString()}
        </div>
        <div className="text-xs text-blue-300 flex items-center justify-center gap-1">
          <Mail className="h-3 w-3" aria-hidden="true" />
          Total
        </div>
      </div>
    </div>
  ), [sentCount, failedCount, pausedCount, totalEmails]);

  const renderRateLimitIndicator = useCallback(() => {
    if (!rateLimit) return null;

    const usagePercentage = (rateLimit.current / rateLimit.max) * 100;

    return (
      <Alert className={isRateLimitNearLimit ? 'border-yellow-500/50' : 'border-blue-500/50'}>
        <Timer className="h-4 w-4" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span className="text-sm">
              Rate limit: {rateLimit.current.toLocaleString()} / {rateLimit.max.toLocaleString()}
              {rateLimitResetTime && ` (resets at ${rateLimitResetTime})`}
            </span>
            <div className="flex items-center gap-2">
              <Zap className={`h-4 w-4 ${isRateLimitNearLimit ? 'text-yellow-400' : 'text-blue-400'}`} />
              <span className="text-xs font-medium">
                {usagePercentage.toFixed(1)}%
              </span>
            </div>
          </div>
          <Progress value={usagePercentage} className="h-1 mt-2" />
        </AlertDescription>
      </Alert>
    );
  }, [rateLimit, isRateLimitNearLimit, rateLimitResetTime]);

  const renderSuccessSection = useCallback(() => (
    <Alert>
      <MailCheck className="h-4 w-4" />
      <AlertDescription>
        <div className="font-medium text-green-400">Campaign completed successfully!</div>
        <p className="text-sm text-green-300 mt-1">
          Sent {sentCount.toLocaleString()} emails with {failedCount.toLocaleString()} failures
          {successRate > 0 && ` (${successRate}% success rate)`}
        </p>
        {sendingState.startTime && sendingState.endTime && (
          <p className="text-xs text-green-400 mt-1">
            Completed in {Math.round((sendingState.endTime.getTime() - sendingState.startTime.getTime()) / 1000)}s
          </p>
        )}
      </AlertDescription>
    </Alert>
  ), [sentCount, failedCount, successRate, sendingState.startTime, sendingState.endTime]);

  const renderErrorSection = useCallback(() => (
    <div className="space-y-3">
      <Alert variant="destructive">
        <MailX className="h-4 w-4" />
        <AlertDescription>
          <div className="font-medium">Campaign failed</div>
          <p className="text-sm mt-1">
            An error occurred during email sending. {errors.length.toLocaleString()} emails failed.
          </p>
        </AlertDescription>
      </Alert>

      {displayErrors.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Failed Emails</h4>
          <ScrollArea className="max-h-32 w-full">
            <div className="space-y-1">
              {displayErrors.map((error, index) => (
                <div
                  key={`${error.email}-${index}`}
                  className="text-sm py-2 px-3 rounded border border-red-900/30 bg-red-900/10"
                >
                  <div className="font-medium text-red-400">{error.email}</div>
                  <div className="text-gray-300 mt-1">{error.error}</div>
                  {showDetails && (
                    <div className="text-xs text-red-300 mt-1 flex items-center gap-2">
                      <span>{error.timestamp.toLocaleTimeString()}</span>
                      {error.code && <span>Code: {error.code}</span>}
                      {error.retryCount && <span>Retries: {error.retryCount}</span>}
                    </div>
                  )}
                </div>
              ))}
              {remainingErrors > 0 && (
                <div className="text-sm text-red-400 py-2 px-3 text-center">
                  + {remainingErrors.toLocaleString()} more error{remainingErrors !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleRetryFailed}>
          <Play className="h-4 w-4 mr-2" />
          Retry Failed
        </Button>
        <Button variant="outline" onClick={handleCancel}>
          <XCircle className="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>
    </div>
  ), [errors.length, displayErrors, remainingErrors, showDetails, handleRetryFailed, handleCancel]);

  // ============================================================================
  // Render
  // ============================================================================

  if (validationErrors.length > 0) {
    return (
      <Card className="w-full border-red-500/50">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium">Invalid component props</div>
              <ul className="mt-2 text-sm list-disc list-inside">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            <span className="ml-2 text-gray-400">Loading email sending status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <EmailSendingErrorBoundary>
      <Card className={`w-full ${className}`} role="region" aria-labelledby="email-campaign-title">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {renderStatusIcon()}
              <CardTitle id="email-campaign-title" className="ml-2 text-lg">
                Email Campaign
              </CardTitle>
            </div>
            <Badge className={statusConfig.color} aria-label={statusConfig.ariaLabel}>
              {statusConfig.text}
            </Badge>
          </div>
          <CardDescription>
            Sending emails to <span className="font-medium">{totalEmails.toLocaleString()}</span> contacts
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {renderProgressSection()}
          {renderStatisticsGrid()}

          {renderRateLimitIndicator()}

          {status === EmailSendingStatus.SENDING && (
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-400">
                Batch {currentBatch.toLocaleString()} of {totalBatches.toLocaleString()}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePause}
                  aria-label="Pause email sending"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  aria-label="Cancel email campaign"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {status === EmailSendingStatus.PAUSED && (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResume}
                aria-label="Resume email sending"
              >
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                aria-label="Cancel email campaign"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}

          {status === EmailSendingStatus.COMPLETED && renderSuccessSection()}

          {status === EmailSendingStatus.ERROR && renderErrorSection()}

          {status === EmailSendingStatus.CANCELLED && (
            <Alert>
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium text-orange-400">Campaign cancelled</div>
                <p className="text-sm text-orange-300 mt-1">
                  Email campaign was cancelled. {sentCount.toLocaleString()} of {totalEmails.toLocaleString()} emails were sent.
                </p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </EmailSendingErrorBoundary>
  );
});

EmailSendingNotificationComponent.displayName = 'EmailSendingNotification';

// ============================================================================
// Exports
// ============================================================================

export const EmailSendingNotification = EmailSendingNotificationComponent;
