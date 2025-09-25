"use client";

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Clock,
  XCircle,
  Download,
  Upload,
  AlertTriangle,
  Loader2,
  FileCheck,
  FileX,
  RefreshCw
} from 'lucide-react';

// ============================================================================
// Types and Interfaces
// ============================================================================

export enum CSVProcessingStatus {
  IDLE = 'idle',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

export interface CSVProcessingError {
  /** Row number where error occurred */
  row: number;
  /** Column name where error occurred */
  column?: string;
  /** Error message */
  message: string;
  /** Severity level */
  severity: 'error' | 'warning';
  /** Timestamp of error */
  timestamp: Date;
}

export interface CSVProcessingIndicatorProps {
  /** Name of the file being processed */
  fileName: string;
  /** Current processing status */
  status: CSVProcessingStatus;
  /** Processing progress as percentage (0-100) */
  progress: number;
  /** Total number of rows in the CSV */
  totalRows: number;
  /** Number of rows processed so far */
  processedRows: number;
  /** Array of processing errors */
  errors: CSVProcessingError[];
  /** Array of processing warnings */
  warnings: CSVProcessingError[];
  /** Callback when user cancels processing */
  onCancel: () => void;
  /** Callback when user downloads error report */
  onDownloadErrors: () => void;
  /** Callback when user retries processing */
  onRetry: () => void;
  /** Whether the component is in a loading state */
  isLoading?: boolean;
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;
  /** Processing speed (rows per second) */
  processingSpeed?: number;
  /** Whether to show detailed error information */
  showDetails?: boolean;
  /** Maximum number of errors to display */
  maxErrorsDisplay?: number;
  /** Maximum number of warnings to display */
  maxWarningsDisplay?: number;
  /** Custom CSS class name */
  className?: string;
}

export interface CSVProcessingState {
  /** Whether processing is paused */
  isPaused: boolean;
  /** Start time of processing */
  startTime?: Date;
  /** End time of processing */
  endTime?: Date;
  /** Last progress update time */
  lastUpdateTime?: Date;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_ERRORS_DISPLAY = 5;
const DEFAULT_MAX_WARNINGS_DISPLAY = 3;
const PROGRESS_UPDATE_INTERVAL = 100; // ms
const ESTIMATION_WINDOW_SIZE = 10; // number of progress points to use for estimation

const STATUS_CONFIG = {
  [CSVProcessingStatus.IDLE]: {
    icon: FileText,
    text: 'Ready',
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    ariaLabel: 'CSV processing is ready to start'
  },
  [CSVProcessingStatus.PROCESSING]: {
    icon: Clock,
    text: 'Processing',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    ariaLabel: 'CSV processing is in progress'
  },
  [CSVProcessingStatus.SUCCESS]: {
    icon: CheckCircle,
    text: 'Completed',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    ariaLabel: 'CSV processing completed successfully'
  },
  [CSVProcessingStatus.ERROR]: {
    icon: AlertCircle,
    text: 'Failed',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    ariaLabel: 'CSV processing failed with errors'
  },
  [CSVProcessingStatus.CANCELLED]: {
    icon: XCircle,
    text: 'Cancelled',
    color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    ariaLabel: 'CSV processing was cancelled'
  }
};

// ============================================================================
// Error Boundary Component
// ============================================================================

interface CSVProcessingErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class CSVProcessingErrorBoundary extends React.Component<
  React.PropsWithChildren<object>,
  CSVProcessingErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<object>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): CSVProcessingErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('CSV Processing Indicator Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="w-full border-red-500/50">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to load CSV processing indicator. Please refresh the page.
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

const formatProcessingSpeed = (speed: number): string => {
  if (speed < 1) return `${(speed * 60).toFixed(1)}/min`;
  return `${speed.toFixed(1)}/s`;
};

const validateProps = (props: CSVProcessingIndicatorProps): string[] => {
  const errors: string[] = [];

  if (props.progress < 0 || props.progress > 100) {
    errors.push('Progress must be between 0 and 100');
  }

  if (props.totalRows < 0) {
    errors.push('Total rows cannot be negative');
  }

  if (props.processedRows < 0 || props.processedRows > props.totalRows) {
    errors.push('Processed rows must be between 0 and total rows');
  }

  if (props.estimatedTimeRemaining && props.estimatedTimeRemaining < 0) {
    errors.push('Estimated time remaining cannot be negative');
  }

  if (props.processingSpeed && props.processingSpeed < 0) {
    errors.push('Processing speed cannot be negative');
  }

  return errors;
};

// ============================================================================
// Main Component
// ============================================================================

const CSVProcessingIndicatorComponent: React.FC<CSVProcessingIndicatorProps> = memo(({
  fileName,
  status,
  progress,
  totalRows,
  processedRows,
  errors,
  warnings,
  onCancel,
  onDownloadErrors,
  onRetry,
  isLoading = false,
  estimatedTimeRemaining,
  processingSpeed,
  showDetails = false,
  maxErrorsDisplay = DEFAULT_MAX_ERRORS_DISPLAY,
  maxWarningsDisplay = DEFAULT_MAX_WARNINGS_DISPLAY,
  className
}) => {
  // ============================================================================
  // State Management
  // ============================================================================

  const [processingState, setProcessingState] = useState<CSVProcessingState>({
    isPaused: false
  });

  // ============================================================================
  // Validation
  // ============================================================================

  const validationErrors = useMemo(() => validateProps({
    fileName, status, progress, totalRows, processedRows, errors, warnings,
    onCancel, onDownloadErrors, onRetry, estimatedTimeRemaining, processingSpeed
  }), [fileName, status, progress, totalRows, processedRows, errors, warnings,
       onCancel, onDownloadErrors, onRetry, estimatedTimeRemaining, processingSpeed]);

  // ============================================================================
  // Memoized Values
  // ============================================================================

  const statusConfig = useMemo(() => STATUS_CONFIG[status], [status]);

  const progressPercentage = useMemo(() => Math.min(100, Math.max(0, progress)), [progress]);

  const hasErrors = useMemo(() => errors.length > 0, [errors.length]);
  const hasWarnings = useMemo(() => warnings.length > 0, [warnings.length]);

  const displayErrors = useMemo(() =>
    errors.slice(0, maxErrorsDisplay), [errors, maxErrorsDisplay]
  );

  const displayWarnings = useMemo(() =>
    warnings.slice(0, maxWarningsDisplay), [warnings, maxWarningsDisplay]
  );

  const remainingErrors = useMemo(() =>
    Math.max(0, errors.length - maxErrorsDisplay), [errors.length, maxErrorsDisplay]
  );

  const remainingWarnings = useMemo(() =>
    Math.max(0, warnings.length - maxWarningsDisplay), [warnings.length, maxWarningsDisplay]
  );

  const formattedTimeRemaining = useMemo(() =>
    estimatedTimeRemaining ? formatTimeRemaining(estimatedTimeRemaining) : null,
    [estimatedTimeRemaining]
  );

  const formattedProcessingSpeed = useMemo(() =>
    processingSpeed ? formatProcessingSpeed(processingSpeed) : null,
    [processingSpeed]
  );

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleCancel = useCallback(() => {
    try {
      onCancel();
    } catch (error) {
      console.error('Failed to cancel CSV processing:', error);
    }
  }, [onCancel]);

  const handleDownloadErrors = useCallback(() => {
    try {
      onDownloadErrors();
    } catch (error) {
      console.error('Failed to download error report:', error);
    }
  }, [onDownloadErrors]);

  const handleRetry = useCallback(() => {
    try {
      onRetry();
    } catch (error) {
      console.error('Failed to retry CSV processing:', error);
    }
  }, [onRetry]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Track processing start/end times
  useEffect(() => {
    if (status === CSVProcessingStatus.PROCESSING && !processingState.startTime) {
      setProcessingState(prev => ({ ...prev, startTime: new Date() }));
    } else if ((status === CSVProcessingStatus.SUCCESS || status === CSVProcessingStatus.ERROR || status === CSVProcessingStatus.CANCELLED) && processingState.startTime && !processingState.endTime) {
      setProcessingState(prev => ({ ...prev, endTime: new Date() }));
    }
  }, [status, processingState.startTime, processingState.endTime]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderStatusIcon = useCallback(() => {
    const IconComponent = status === CSVProcessingStatus.PROCESSING ? Loader2 : statusConfig.icon;

    return (
      <IconComponent
        className={`h-5 w-5 ${status === CSVProcessingStatus.PROCESSING ? 'animate-spin' : ''}`}
        aria-hidden="true"
      />
    );
  }, [status, statusConfig.icon]);

  const renderProgressSection = useCallback(() => (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-gray-400" id="progress-label">
          {status === CSVProcessingStatus.PROCESSING ? 'Processing...' : statusConfig.text}
        </span>
        <span className="font-medium" aria-labelledby="progress-label">
          {processedRows.toLocaleString()} / {totalRows.toLocaleString()} rows
          {formattedProcessingSpeed && (
            <span className="text-gray-400 ml-2">
              ({formattedProcessingSpeed})
            </span>
          )}
        </span>
      </div>
      <Progress
        value={progressPercentage}
        className="h-2"
        aria-label={`Processing progress: ${progressPercentage}% complete`}
      />
      {status === CSVProcessingStatus.PROCESSING && formattedTimeRemaining && (
        <div className="text-xs text-gray-400 text-right">
          Estimated time remaining: {formattedTimeRemaining}
        </div>
      )}
    </div>
  ), [status, statusConfig.text, processedRows, totalRows, formattedProcessingSpeed, progressPercentage, formattedTimeRemaining]);

  const renderSuccessSection = useCallback(() => (
    <Alert>
      <FileCheck className="h-4 w-4" />
      <AlertDescription>
        <div className="font-medium text-green-400">Processing completed successfully!</div>
        <p className="text-sm text-green-300 mt-1">
          Successfully processed {processedRows.toLocaleString()} contacts from {fileName}
        </p>
        {processingState.startTime && processingState.endTime && (
          <p className="text-xs text-green-400 mt-1">
            Completed in {Math.round((processingState.endTime.getTime() - processingState.startTime.getTime()) / 1000)}s
          </p>
        )}
      </AlertDescription>
    </Alert>
  ), [processedRows, fileName, processingState.startTime, processingState.endTime]);

  const renderErrorSection = useCallback(() => (
    <div className="space-y-3">
      <Alert variant="destructive">
        <FileX className="h-4 w-4" />
        <AlertDescription>
          <div className="font-medium">Processing failed</div>
          <p className="text-sm mt-1">
            {errors.length.toLocaleString()} error{errors.length !== 1 ? 's' : ''} occurred during processing
          </p>
        </AlertDescription>
      </Alert>

      {displayErrors.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-gray-300">Errors</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadErrors}
              aria-label="Download error report"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
          </div>
          <ScrollArea className="max-h-32 w-full">
            <div className="space-y-1">
              {displayErrors.map((error, index) => (
                <div
                  key={`${error.row}-${index}`}
                  className="text-sm text-red-400 py-2 px-3 rounded border border-red-900/30 bg-red-900/10"
                >
                  <div className="font-medium">Row {error.row.toLocaleString()}</div>
                  {error.column && (
                    <div className="text-xs text-red-300">Column: {error.column}</div>
                  )}
                  <div className="mt-1">{error.message}</div>
                  {showDetails && (
                    <div className="text-xs text-red-300 mt-1">
                      {error.timestamp.toLocaleTimeString()}
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
        <Button variant="outline" onClick={handleRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
        <Button variant="outline" onClick={handleCancel}>
          Cancel
        </Button>
      </div>
    </div>
  ), [errors.length, displayErrors, remainingErrors, showDetails, handleDownloadErrors, handleRetry, handleCancel]);

  const renderWarningsSection = useCallback(() => (
    <div>
      <h4 className="text-sm font-medium text-yellow-400 mb-2 flex items-center">
        <AlertTriangle className="h-4 w-4 mr-1" />
        Warnings ({warnings.length.toLocaleString()})
      </h4>
      <ScrollArea className="max-h-24 w-full">
        <div className="space-y-1">
          {displayWarnings.map((warning, index) => (
            <div
              key={`${warning.row}-${index}`}
              className="text-sm text-yellow-400 py-2 px-3 rounded border border-yellow-900/30 bg-yellow-900/10"
            >
              <div className="font-medium">Row {warning.row.toLocaleString()}</div>
              {warning.column && (
                <div className="text-xs text-yellow-300">Column: {warning.column}</div>
              )}
              <div className="mt-1">{warning.message}</div>
              {showDetails && (
                <div className="text-xs text-yellow-300 mt-1">
                  {warning.timestamp.toLocaleTimeString()}
                </div>
              )}
            </div>
          ))}
          {remainingWarnings > 0 && (
            <div className="text-sm text-yellow-400 py-2 px-3 text-center">
              + {remainingWarnings.toLocaleString()} more warning{remainingWarnings !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  ), [warnings.length, displayWarnings, remainingWarnings, showDetails]);

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
            <span className="ml-2 text-gray-400">Loading CSV processing status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <CSVProcessingErrorBoundary>
      <Card className={`w-full ${className}`} role="region" aria-labelledby="csv-processing-title">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              {renderStatusIcon()}
              <CardTitle id="csv-processing-title" className="ml-2 text-lg">
                CSV Processing
              </CardTitle>
            </div>
            <Badge className={statusConfig.color} aria-label={statusConfig.ariaLabel}>
              {statusConfig.text}
            </Badge>
          </div>
          <CardDescription>
            Processing file: <span className="font-medium">{fileName}</span>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {renderProgressSection()}

          {status === CSVProcessingStatus.PROCESSING && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                aria-label="Cancel CSV processing"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}

          {status === CSVProcessingStatus.SUCCESS && renderSuccessSection()}

          {status === CSVProcessingStatus.ERROR && renderErrorSection()}

          {hasWarnings && renderWarningsSection()}

          {status === CSVProcessingStatus.CANCELLED && (
            <Alert>
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-medium text-yellow-400">Processing cancelled</div>
                <p className="text-sm text-yellow-300 mt-1">
                  CSV processing was cancelled. {processedRows.toLocaleString()} of {totalRows.toLocaleString()} rows were processed.
                </p>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </CSVProcessingErrorBoundary>
  );
});

CSVProcessingIndicatorComponent.displayName = 'CSVProcessingIndicator';

// ============================================================================
// Exports
// ============================================================================

export const CSVProcessingIndicator = CSVProcessingIndicatorComponent;
