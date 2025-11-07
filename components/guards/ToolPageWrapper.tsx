"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Loader2, ShieldAlert, AlertTriangle } from "lucide-react";

type Role = "admin" | "leader" | "co-leader" | "member";

interface ToolPageWrapperProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
  toolName?: string;
  toolPath?: string;
  requireApproval?: boolean;
  checkDatabasePermission?: boolean;
  onAccessDenied?: (reason: string) => void;
  loadingMessage?: string;
}

/**
 * Enterprise-grade Tool Page Wrapper Component
 * 
 * Provides page-level access control for tool pages with:
 * - Role-based access control
 * - Approval status verification
 * - Optional database permission checking
 * - Request access flow integration
 * - Comprehensive error handling
 * - Performance optimization
 * - Security logging
 * 
 * @example
 * // Basic usage with role restriction
 * <ToolPageWrapper 
 *   allowedRoles={["admin", "leader", "co-leader"]}
 *   toolName="Agritech Startup Seeker"
 *   toolPath="/tools/startup-seeker"
 * >
 *   <StartupSeekerTool />
 * </ToolPageWrapper>
 * 
 * @example
 * // With database permission check
 * <ToolPageWrapper 
 *   allowedRoles={["admin", "leader"]}
 *   toolName="AI Outreach Agent"
 *   checkDatabasePermission={true}
 * >
 *   <AIOutreachAgent />
 * </ToolPageWrapper>
 */
export default function ToolPageWrapper({
  children,
  allowedRoles = ["admin", "leader", "co-leader", "member"],
  toolName,
  toolPath,
  requireApproval = true,
  checkDatabasePermission = false,
  onAccessDenied,
  loadingMessage,
}: ToolPageWrapperProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [accessDeniedReason, setAccessDeniedReason] = useState<string | null>(null);

  // Memoize user data
  const userData = useMemo(() => {
    if (!session?.user) return null;
    return {
      role: (session.user as any)?.role as Role,
      isApproved: (session.user as any)?.isApproved as boolean,
      id: (session.user as any)?.id as string,
      email: session.user.email || '',
    };
  }, [session]);

  // Memoize current path
  const currentPath = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return window.location.pathname;
  }, []);

  /**
   * Check database permission for tool access
   */
  const checkToolPermission = useCallback(async (): Promise<boolean> => {
    if (!checkDatabasePermission || !toolPath) return true;

    try {
      const response = await fetch(
        `/api/permissions/check?toolPath=${encodeURIComponent(toolPath)}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        console.error('[ToolPageWrapper] Permission check failed:', response.status);
        return false;
      }

      const data = await response.json();
      return data.allowed === true;
    } catch (error) {
      console.error('[ToolPageWrapper] Error checking tool permission:', error);
      return false;
    }
  }, [checkDatabasePermission, toolPath]);

  /**
   * Build unauthorized URL with context
   */
  const buildUnauthorizedUrl = useCallback((reason: string): string => {
    const params = new URLSearchParams();
    
    if (toolName) {
      params.set('tool', toolName);
    }
    
    if (toolPath || currentPath) {
      params.set('path', toolPath || currentPath);
    }
    
    params.set('reason', reason);
    
    return `/unauthorized?${params.toString()}`;
  }, [toolName, toolPath, currentPath]);

  /**
   * Log access denial for security audit
   */
  const logAccessDenial = useCallback((reason: string) => {
    console.warn('[ToolPageWrapper] Access denied:', {
      tool: toolName || 'Unknown',
      path: toolPath || currentPath,
      reason,
      userRole: userData?.role,
      userEmail: userData?.email,
      timestamp: new Date().toISOString(),
    });
  }, [toolName, toolPath, currentPath, userData]);

  /**
   * Main access control logic
   */
  const checkAccess = useCallback(async () => {
    try {
      // Wait for session to load
      if (status === "loading") return;

      // Authentication check
      if (status === "unauthenticated" || !session?.user) {
        console.warn('[ToolPageWrapper] User not authenticated');
        router.push("/signin");
        return;
      }

      // User data validation
      if (!userData) {
        console.error('[ToolPageWrapper] Invalid user data');
        setAccessDeniedReason("Invalid session");
        setChecking(false);
        router.push("/signin");
        return;
      }

      // Approval status check
      if (requireApproval && userData.isApproved === false) {
        console.warn('[ToolPageWrapper] User not approved:', userData.email);
        logAccessDenial("Account pending approval");
        router.push("/pending-approval");
        return;
      }

      // Role-based access check
      if (!allowedRoles.includes(userData.role)) {
        const reason = `Role '${userData.role}' not authorized`;
        logAccessDenial(reason);
        setAccessDeniedReason(reason);
        
        if (onAccessDenied) {
          onAccessDenied(reason);
        }
        
        router.push(buildUnauthorizedUrl(reason));
        return;
      }

      // Database permission check (if enabled)
      if (checkDatabasePermission) {
        const hasPermission = await checkToolPermission();
        
        if (!hasPermission) {
          const reason = "Database permission denied";
          logAccessDenial(reason);
          setAccessDeniedReason(reason);
          
          if (onAccessDenied) {
            onAccessDenied(reason);
          }
          
          router.push(buildUnauthorizedUrl(reason));
          return;
        }
      }

      // All checks passed
      console.log('[ToolPageWrapper] Access granted:', {
        tool: toolName || 'Unknown',
        userRole: userData.role,
        userEmail: userData.email,
      });
      
      setAccessDeniedReason(null);
      setChecking(false);
    } catch (error) {
      console.error('[ToolPageWrapper] Unexpected error during access check:', error);
      setAccessDeniedReason("An unexpected error occurred");
      setChecking(false);
      router.push("/unauthorized");
    }
  }, [
    status,
    session,
    userData,
    requireApproval,
    allowedRoles,
    checkDatabasePermission,
    checkToolPermission,
    router,
    buildUnauthorizedUrl,
    logAccessDenial,
    onAccessDenied,
    toolName,
  ]);

  // Run access check on mount and when dependencies change
  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  // Loading state
  if (status === "loading" || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 dark:text-blue-400 mx-auto mb-4" />
          {(loadingMessage || toolName) && (
            <p className="text-gray-600 dark:text-gray-400">
              {loadingMessage || `Loading ${toolName}...`}
            </p>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
            Verifying access permissions
          </p>
        </div>
      </div>
    );
  }

  // Access denied state (should not render, but safety fallback)
  if (accessDeniedReason) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md p-8">
          <ShieldAlert className="w-16 h-16 text-red-600 dark:text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {accessDeniedReason}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push("/home")}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Home
            </button>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Access granted - render children
  return <>{children}</>;
}
