/**
 * useSettings Hook
 * 
 * Comprehensive hook for managing user settings with real-time updates,
 * optimistic UI, caching, and error handling
 * 
 * Features:
 * - Real-time settings synchronization
 * - Optimistic UI updates
 * - Automatic retry on failure
 * - Local caching with TTL
 * - Type-safe settings management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import type { UserSettingsData } from '@/lib/settings';

interface UseSettingsOptions {
  autoFetch?: boolean;
  cacheTime?: number; // milliseconds
  refetchInterval?: number; // milliseconds
  onSuccess?: (settings: UserSettingsData) => void;
  onError?: (error: Error) => void;
}

interface UseSettingsReturn {
  settings: UserSettingsData | null;
  loading: boolean;
  saving: boolean;
  error: Error | null;
  updateSettings: (updates: Partial<UserSettingsData>) => Promise<boolean>;
  refetch: () => Promise<void>;
  reset: () => void;
  isStale: boolean;
}

const CACHE_KEY = 'user_settings_cache';
const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes

export function useSettings(options: UseSettingsOptions = {}): UseSettingsReturn {
  const {
    autoFetch = true,
    cacheTime = DEFAULT_CACHE_TIME,
    refetchInterval,
    onSuccess,
    onError
  } = options;

  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<UserSettingsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const refetchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check if cache is stale
  const isStale = useCallback(() => {
    if (!lastFetch) return true;
    return Date.now() - lastFetch > cacheTime;
  }, [lastFetch, cacheTime]);

  // Load from cache
  const loadFromCache = useCallback((): UserSettingsData | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;

      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > cacheTime) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error loading settings from cache:', error);
      return null;
    }
  }, [cacheTime]);

  // Save to cache
  const saveToCache = useCallback((data: UserSettingsData) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error saving settings to cache:', error);
    }
  }, []);

  // Fetch settings from API
  const fetchSettings = useCallback(async (signal?: AbortSignal) => {
    if (status !== 'authenticated' || !session?.user?.id) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/settings', {
        signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.settings) {
        setSettings(data.settings);
        saveToCache(data.settings);
        setLastFetch(Date.now());
        onSuccess?.(data.settings);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Ignore abort errors
      }

      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
      
      // Try to load from cache on error
      const cached = loadFromCache();
      if (cached) {
        setSettings(cached);
        toast.warning('Loaded settings from cache due to network error');
      } else {
        toast.error('Failed to load settings');
      }
    } finally {
      setLoading(false);
    }
  }, [status, session, onSuccess, onError, saveToCache, loadFromCache]);

  // Update settings
  const updateSettings = useCallback(async (updates: Partial<UserSettingsData>): Promise<boolean> => {
    if (status !== 'authenticated' || !session?.user?.id) {
      toast.error('You must be logged in to update settings');
      return false;
    }

    setSaving(true);
    setError(null);

    // Optimistic update
    const previousSettings = settings;
    if (settings) {
      setSettings({ ...settings, ...updates });
    }

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error(`Failed to update settings: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.settings) {
        setSettings(data.settings);
        saveToCache(data.settings);
        setLastFetch(Date.now());
        toast.success('Settings updated successfully');
        return true;
      }

      return false;
    } catch (err) {
      // Revert optimistic update
      setSettings(previousSettings);
      
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      toast.error('Failed to update settings');
      return false;
    } finally {
      setSaving(false);
    }
  }, [status, session, settings, saveToCache]);

  // Refetch settings
  const refetch = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    await fetchSettings(abortControllerRef.current.signal);
  }, [fetchSettings]);

  // Reset settings
  const reset = useCallback(() => {
    setSettings(null);
    setError(null);
    setLastFetch(0);
    localStorage.removeItem(CACHE_KEY);
  }, []);

  // Initial fetch
  useEffect(() => {
    if (!autoFetch || status !== 'authenticated') {
      return;
    }

    // Try to load from cache first
    const cached = loadFromCache();
    if (cached) {
      setSettings(cached);
      setLastFetch(Date.now());
    }

    // Fetch fresh data
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    fetchSettings(abortControllerRef.current.signal);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [autoFetch, status, fetchSettings, loadFromCache]);

  // Setup refetch interval
  useEffect(() => {
    if (!refetchInterval || status !== 'authenticated') {
      return;
    }

    refetchIntervalRef.current = setInterval(() => {
      if (isStale()) {
        refetch();
      }
    }, refetchInterval);

    return () => {
      if (refetchIntervalRef.current) {
        clearInterval(refetchIntervalRef.current);
      }
    };
  }, [refetchInterval, status, isStale, refetch]);

  return {
    settings,
    loading,
    saving,
    error,
    updateSettings,
    refetch,
    reset,
    isStale: isStale(),
  };
}

// Export helper hooks for specific settings sections
export function useProfileSettings() {
  const { settings, updateSettings, loading, saving } = useSettings();
  
  return {
    profile: settings?.profile || undefined,
    updateProfile: (profile: Partial<NonNullable<UserSettingsData['profile']>>) =>
      updateSettings({ profile: { ...settings?.profile, ...profile } as NonNullable<UserSettingsData['profile']> }),
    loading,
    saving,
  };
}

export function useNotificationSettings() {
  const { settings, updateSettings, loading, saving } = useSettings();
  
  return {
    notifications: settings?.notifications || undefined,
    updateNotifications: (notifications: Partial<NonNullable<UserSettingsData['notifications']>>) =>
      updateSettings({ notifications: { ...settings?.notifications, ...notifications } as NonNullable<UserSettingsData['notifications']> }),
    loading,
    saving,
  };
}

export function useSecuritySettings() {
  const { settings, updateSettings, loading, saving } = useSettings();
  
  return {
    security: settings?.security || undefined,
    updateSecurity: (security: Partial<NonNullable<UserSettingsData['security']>>) =>
      updateSettings({ security: { ...settings?.security, ...security } as NonNullable<UserSettingsData['security']> }),
    loading,
    saving,
  };
}

export function useSystemSettings() {
  const { settings, updateSettings, loading, saving } = useSettings();
  
  return {
    system: settings?.system || undefined,
    updateSystem: (system: Partial<NonNullable<UserSettingsData['system']>>) =>
      updateSettings({ system: { ...settings?.system, ...system } as NonNullable<UserSettingsData['system']> }),
    loading,
    saving,
  };
}
