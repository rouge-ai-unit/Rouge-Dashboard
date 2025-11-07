/**
 * API Authorization Middleware
 * Protects API endpoints with role and permission checks
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkPermission } from '@/lib/permissions';

type Role = 'admin' | 'leader' | 'co-leader' | 'member';

interface ApiAuthOptions {
  requiredRole?: Role;
  requiredRoles?: Role[];
  requiredPermission?: {
    resource: string;
    action: string;
  };
  logUnauthorized?: boolean;
}

/**
 * Require specific role for API endpoint
 */
export async function requireRole(
  request: NextRequest,
  options: ApiAuthOptions
): Promise<{ authorized: boolean; response?: NextResponse; userId?: string; userRole?: string }> {
  const {
    requiredRole,
    requiredRoles,
    logUnauthorized = true,
  } = options;

  try {
    // Get session
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      if (logUnauthorized) {
        console.warn('[API Auth] Unauthenticated API access attempt:', {
          path: request.nextUrl.pathname,
          ip: request.headers.get('x-forwarded-for') || 'unknown',
        });
      }
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Unauthorized - Authentication required' },
          { status: 401 }
        ),
      };
    }

    const userId = (session.user as any)?.id;
    const userRole = (session.user as any)?.role as Role;
    const isApproved = (session.user as any)?.isApproved;

    // Check if user is approved
    if (isApproved === false) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Account pending approval' },
          { status: 403 }
        ),
      };
    }

    // Check role requirement
    if (requiredRole || requiredRoles) {
      const allowedRoles = requiredRoles || (requiredRole ? [requiredRole] : []);
      
      if (!userRole || !allowedRoles.includes(userRole)) {
        if (logUnauthorized) {
          console.warn('[API Auth] Insufficient role for API access:', {
            path: request.nextUrl.pathname,
            userRole,
            requiredRoles: allowedRoles,
            email: session.user.email,
            ip: request.headers.get('x-forwarded-for') || 'unknown',
          });
        }
        return {
          authorized: false,
          response: NextResponse.json(
            { error: 'Forbidden - Insufficient permissions' },
            { status: 403 }
          ),
        };
      }
    }

    return {
      authorized: true,
      userId,
      userRole,
    };
  } catch (error) {
    console.error('[API Auth] Error in role check:', error);
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Require specific permission for API endpoint
 */
export async function requirePermission(
  request: NextRequest,
  resource: string,
  action: string = 'execute'
): Promise<{ authorized: boolean; response?: NextResponse; userId?: string }> {
  try {
    // Get session
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      console.warn('[API Auth] Unauthenticated API access attempt:', {
        path: request.nextUrl.pathname,
        resource,
        action,
      });
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Unauthorized - Authentication required' },
          { status: 401 }
        ),
      };
    }

    const userId = (session.user as any)?.id;

    // Check permission
    const hasAccess = await checkPermission(userId, resource, action);

    if (!hasAccess) {
      console.warn('[API Auth] Permission denied for API access:', {
        path: request.nextUrl.pathname,
        userId,
        resource,
        action,
        email: session.user.email,
      });
      return {
        authorized: false,
        response: NextResponse.json(
          { error: 'Forbidden - You do not have permission to access this resource' },
          { status: 403 }
        ),
      };
    }

    return {
      authorized: true,
      userId,
    };
  } catch (error) {
    console.error('[API Auth] Error in permission check:', error);
    return {
      authorized: false,
      response: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Combined role and permission check
 */
export async function requireRoleAndPermission(
  request: NextRequest,
  options: ApiAuthOptions & { resource: string; action: string }
): Promise<{ authorized: boolean; response?: NextResponse; userId?: string; userRole?: string }> {
  // First check role
  const roleCheck = await requireRole(request, options);
  
  if (!roleCheck.authorized) {
    return roleCheck;
  }

  // Then check permission
  const permissionCheck = await requirePermission(request, options.resource, options.action);
  
  if (!permissionCheck.authorized) {
    return permissionCheck;
  }

  return {
    authorized: true,
    userId: roleCheck.userId,
    userRole: roleCheck.userRole,
  };
}

/**
 * Get authenticated user from request
 */
export async function getAuthenticatedUser(request: NextRequest): Promise<{
  authenticated: boolean;
  userId?: string;
  userRole?: string;
  userEmail?: string;
  response?: NextResponse;
}> {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return {
        authenticated: false,
        response: NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        ),
      };
    }

    const userId = (session.user as any)?.id;
    const userRole = (session.user as any)?.role;
    const userEmail = session.user.email || undefined;
    const isApproved = (session.user as any)?.isApproved;

    if (isApproved === false) {
      return {
        authenticated: false,
        response: NextResponse.json(
          { error: 'Account pending approval' },
          { status: 403 }
        ),
      };
    }

    return {
      authenticated: true,
      userId,
      userRole,
      userEmail,
    };
  } catch (error) {
    console.error('[API Auth] Error getting authenticated user:', error);
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      ),
    };
  }
}
