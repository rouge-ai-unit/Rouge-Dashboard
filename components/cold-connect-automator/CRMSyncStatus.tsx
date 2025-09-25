"use client";

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Database,
  Cloud,
  CloudOff,
  Wifi,
  WifiOff,
  AlertTriangle,
  Loader2
} from 'lucide-react';

// ============================================================================
// Types and Interfaces
// ============================================================================

export enum CRMSyncStatusType {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  SYNCING = 'syncing',
  ERROR = 'error'
}

export enum CRMServiceType {
  NOTION = 'notion',
  GOOGLE_SHEETS = 'google-sheets'
}

export interface CRMSyncStatusProps {
  /** Current sync status for Notion CRM */
  notionStatus: CRMSyncStatusType;
  /** Current sync status for Google Sheets CRM */
  googleSheetsStatus: CRMSyncStatusType;
  /** Timestamp of the last successful sync */
  lastSync?: Date;
  /** Callback when user initiates a sync operation */
  onSync: (service: CRMServiceType) => Promise<void>;
  /** Callback when user wants to configure a CRM service */
  onConfigure: (service: CRMServiceType) => void;
  /** Whether the component is in a loading state */
  isLoading?: boolean;
  /** Error message to display */
  error?: string;
  /** Callback to retry failed operations */
  onRetry?: () => void;
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Whether to show detailed sync information */
  showDetails?: boolean;
  /** Custom CSS class name */
  className?: string;
}

export interface CRMSyncState {
  /** Whether sync is currently in progress */
  isSyncing: boolean;
  /** Number of retry attempts made */
  retryCount: number;
  /** Last error that occurred during sync */
  lastError?: string;
  /** Timestamp of last sync attempt */
  lastAttempt?: Date;
}

export interface CRMServiceConfig {
  /** Display name of the service */
  name: string;
  /** Icon component for the service */
  icon: React.ComponentType<{ className?: string }>;
  /** Description of the service */
  description: string;
  /** Whether the service supports real-time sync */
  supportsRealTime: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const CRM_SERVICE_CONFIGS: Record<CRMServiceType, CRMServiceConfig> = {
  [CRMServiceType.NOTION]: {
    name: 'Notion',
    icon: Database,
    description: 'Sync contacts with your Notion workspace',
    supportsRealTime: false
  },
  [CRMServiceType.GOOGLE_SHEETS]: {
    name: 'Google Sheets',
    icon: Cloud,
    description: 'Sync contacts with Google Sheets',
    supportsRealTime: true
  }
};

const SYNC_STATUS_CONFIG = {
  [CRMSyncStatusType.CONNECTED]: {
    icon: CheckCircle,
    text: 'Connected',
    color: 'bg-green-500/20 text-green-400 border-green-500/30',
    ariaLabel: 'CRM service is connected and ready'
  },
  [CRMSyncStatusType.DISCONNECTED]: {
    icon: CloudOff,
    text: 'Disconnected',
    color: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    ariaLabel: 'CRM service is disconnected'
  },
  [CRMSyncStatusType.SYNCING]: {
    icon: RefreshCw,
    text: 'Syncing',
    color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    ariaLabel: 'CRM service is currently syncing'
  },
  [CRMSyncStatusType.ERROR]: {
    icon: AlertCircle,
    text: 'Error',
    color: 'bg-red-500/20 text-red-400 border-red-500/30',
    ariaLabel: 'CRM service encountered an error'
  }
};

const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ============================================================================
// Error Boundary Component
// ============================================================================

interface CRMSyncErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class CRMSyncErrorBoundary extends React.Component<
  React.PropsWithChildren<object>,
  CRMSyncErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<object>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): CRMSyncErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('CRM Sync Status Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="w-full border-red-500/50">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to load CRM sync status. Please refresh the page.
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
// Main Component
// ============================================================================

const CRMSyncStatusComponent: React.FC<CRMSyncStatusProps> = memo(({
  notionStatus,
  googleSheetsStatus,
  lastSync,
  onSync,
  onConfigure,
  isLoading = false,
  error,
  onRetry,
  maxRetries = DEFAULT_MAX_RETRIES,
  showDetails = false,
  className
}) => {
  // ============================================================================
  // State Management
  // ============================================================================

  const [syncStates, setSyncStates] = useState<Record<CRMServiceType, CRMSyncState>>({
    [CRMServiceType.NOTION]: { isSyncing: false, retryCount: 0 },
    [CRMServiceType.GOOGLE_SHEETS]: { isSyncing: false, retryCount: 0 }
  });

  // ============================================================================
  // Memoized Values
  // ============================================================================

  const services = useMemo(() => [
    {
      type: CRMServiceType.NOTION,
      status: notionStatus,
      config: CRM_SERVICE_CONFIGS[CRMServiceType.NOTION]
    },
    {
      type: CRMServiceType.GOOGLE_SHEETS,
      status: googleSheetsStatus,
      config: CRM_SERVICE_CONFIGS[CRMServiceType.GOOGLE_SHEETS]
    }
  ], [notionStatus, googleSheetsStatus]);

  const hasActiveSync = useMemo(() =>
    Object.values(syncStates).some(state => state.isSyncing),
    [syncStates]
  );

  const formattedLastSync = useMemo(() => {
    if (!lastSync) return null;
    try {
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(lastSync);
    } catch {
      return lastSync.toLocaleString();
    }
  }, [lastSync]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  const handleSync = useCallback(async (service: CRMServiceType) => {
    const currentState = syncStates[service];
    if (currentState.isSyncing) return;

    setSyncStates(prev => ({
      ...prev,
      [service]: {
        ...prev[service],
        isSyncing: true,
        lastError: undefined,
        lastAttempt: new Date()
      }
    }));

    try {
      await onSync(service);
      // Reset retry count on successful sync
      setSyncStates(prev => ({
        ...prev,
        [service]: {
          ...prev[service],
          retryCount: 0,
          lastError: undefined
        }
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setSyncStates(prev => ({
        ...prev,
        [service]: {
          ...prev[service],
          lastError: errorMessage
        }
      }));
    } finally {
      setSyncStates(prev => ({
        ...prev,
        [service]: {
          ...prev[service],
          isSyncing: false
        }
      }));
    }
  }, [onSync, syncStates]);

  const handleRetry = useCallback(async (service: CRMServiceType) => {
    const currentState = syncStates[service];
    if (currentState.retryCount >= maxRetries) return;

    // Add delay before retry
    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));

    setSyncStates(prev => ({
      ...prev,
      [service]: {
        ...prev[service],
        retryCount: prev[service].retryCount + 1
      }
    }));

    await handleSync(service);
  }, [handleSync, maxRetries, syncStates]);

  const handleConfigure = useCallback((service: CRMServiceType) => {
    try {
      onConfigure(service);
    } catch (error) {
      console.error(`Failed to configure ${service}:`, error);
    }
  }, [onConfigure]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderStatusIcon = useCallback((status: CRMSyncStatusType, isLocalSyncing: boolean) => {
    const config = SYNC_STATUS_CONFIG[status];
    const IconComponent = isLocalSyncing ? Loader2 : config.icon;

    return (
      <IconComponent
        className={`h-5 w-5 ${isLocalSyncing ? 'animate-spin text-blue-400' : ''}`}
        aria-hidden="true"
      />
    );
  }, []);

  const renderServiceCard = useCallback((service: typeof services[0]) => {
    const { type, status, config } = service;
    const syncState = syncStates[type];
    const statusConfig = SYNC_STATUS_CONFIG[status];
    const canSync = status !== CRMSyncStatusType.DISCONNECTED && !syncState.isSyncing;
    const canRetry = syncState.lastError && syncState.retryCount < maxRetries;

    return (
      <div
        key={type}
        className="flex items-center justify-between p-4 rounded-lg border border-gray-700 hover:bg-gray-800/50 transition-colors"
        role="region"
        aria-labelledby={`${type}-status-label`}
      >
        <div className="flex items-center flex-1 min-w-0">
          <div className="mr-3 flex-shrink-0">
            {renderStatusIcon(status, syncState.isSyncing)}
          </div>
          <div className="min-w-0 flex-1">
            <div
              id={`${type}-status-label`}
              className="font-medium text-gray-200"
            >
              {config.name}
            </div>
            <Badge
              className={`mt-1 ${statusConfig.color}`}
              aria-label={statusConfig.ariaLabel}
            >
              {syncState.isSyncing ? 'Syncing...' : statusConfig.text}
            </Badge>
            {showDetails && config.description && (
              <p className="text-sm text-gray-400 mt-1">
                {config.description}
              </p>
            )}
            {syncState.lastError && (
              <Alert variant="destructive" className="mt-2">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {syncState.lastError}
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        <div className="flex gap-2 ml-4 flex-shrink-0">
          {canRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRetry(type)}
              disabled={syncState.isSyncing}
              aria-label={`Retry sync for ${config.name}`}
            >
              <RefreshCw className="h-4 w-4" />
              Retry ({syncState.retryCount}/{maxRetries})
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSync(type)}
            disabled={!canSync}
            aria-label={`Sync ${config.name} ${canSync ? '' : '(disabled)'}`}
          >
            {syncState.isSyncing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Sync
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleConfigure(type)}
            aria-label={`Configure ${config.name}`}
          >
            Configure
          </Button>
        </div>
      </div>
    );
  }, [syncStates, maxRetries, showDetails, renderStatusIcon, handleRetry, handleSync, handleConfigure]);

  // ============================================================================
  // Effects
  // ============================================================================

  // Reset sync states when component unmounts or statuses change
  useEffect(() => {
    return () => {
      setSyncStates({
        [CRMServiceType.NOTION]: { isSyncing: false, retryCount: 0 },
        [CRMServiceType.GOOGLE_SHEETS]: { isSyncing: false, retryCount: 0 }
      });
    };
  }, []);

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <Card className={`w-full ${className}`}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            <span className="ml-2 text-gray-400">Loading CRM sync status...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <CRMSyncErrorBoundary>
      <Card className={`w-full ${className}`} role="region" aria-labelledby="crm-sync-title">
        <CardHeader>
          <CardTitle id="crm-sync-title" className="flex items-center">
            <Database className="h-5 w-5 mr-2" aria-hidden="true" />
            CRM Sync Status
          </CardTitle>
          <CardDescription>
            Manage connections and sync status with your CRM systems
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {error}
                {onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    className="ml-2"
                  >
                    Retry
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3" role="list" aria-label="CRM services">
            {services.map(renderServiceCard)}
          </div>

          {formattedLastSync && (
            <div className="flex items-center text-sm text-gray-400 pt-2">
              <Clock className="h-4 w-4 mr-2" aria-hidden="true" />
              <span>Last sync: {formattedLastSync}</span>
            </div>
          )}

          {hasActiveSync && (
            <div className="flex items-center text-sm text-blue-400 pt-2">
              <Wifi className="h-4 w-4 mr-2 animate-pulse" aria-hidden="true" />
              <span>Sync in progress...</span>
            </div>
          )}

          <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
            <p>Sync your contacts with Notion or Google Sheets to keep your CRM up to date.</p>
            <p className="mt-1">Configure your CRM connections in the settings panel.</p>
            {showDetails && (
              <p className="mt-1">
                <WifiOff className="h-3 w-3 inline mr-1" aria-hidden="true" />
                Real-time sync is available for Google Sheets.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </CRMSyncErrorBoundary>
  );
});

CRMSyncStatusComponent.displayName = 'CRMSyncStatus';

// ============================================================================
// Exports
// ============================================================================

export const CRMSyncStatus = CRMSyncStatusComponent;
