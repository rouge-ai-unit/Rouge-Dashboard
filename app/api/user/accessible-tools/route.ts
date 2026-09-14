/**
 * API Route: Get User's Accessible Tools
 * Returns dynamic list of tools based on user's role and permissions
 *
 * Retired tools (see lib/tool-registry.ts) are intentionally not listed here.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAccessibleTools } from '@/lib/permissions';

// Tool definitions with metadata
type ToolDef = {
  id: string;
  title: string;
  href: string;
  icon: string;
  order: number;
  alwaysVisible?: boolean;
  requiresPermission?: boolean;
  adminOnly?: boolean;
};

const ALL_TOOLS: ToolDef[] = [
  // Normal Dashboard Tools
  {
    id: 'home',
    title: 'Home',
    href: '/home',
    icon: 'LayoutDashboard',
    order: 0,
    alwaysVisible: true,
  },
  {
    id: 'contact-finder',
    title: 'Contact Finder',
    href: '/tools/contact-finder',
    icon: 'Search',
    order: 1,
    alwaysVisible: true,
  },
  {
    id: 'ai-list',
    title: 'AI List',
    href: '/tools/ai-list',
    icon: 'Bot',
    order: 2,
    alwaysVisible: true,
  },
  {
    id: 'ai-news-daily',
    title: 'AI News Daily',
    href: '/tools/ai-news-daily',
    icon: 'Newspaper',
    order: 3,
    alwaysVisible: true,
  },
  {
    id: 'startup-seeker',
    title: 'Agritech Startup Seeker',
    href: '/tools/startup-seeker',
    icon: 'Target',
    order: 4,
    requiresPermission: true,
  },
  {
    id: 'sentiment-analyzer',
    title: 'Sentiment Analyzer',
    href: '/tools/sentiment-analyzer',
    icon: 'TrendingUp',
    order: 5,
    requiresPermission: true,
  },

  // Admin-Only Tools (ordered logically)
  {
    id: 'admin-dashboard',
    title: 'Admin Dashboard',
    href: '/admin/dashboard',
    icon: 'Shield',
    order: 1,
    adminOnly: true,
  },
  {
    id: 'admin-users',
    title: 'User Management',
    href: '/admin/users',
    icon: 'UserCog2',
    order: 2,
    adminOnly: true,
  },
  {
    id: 'admin-approvals',
    title: 'Approval Queue',
    href: '/admin/approvals',
    icon: 'FileText',
    order: 3,
    adminOnly: true,
  },
  {
    id: 'admin-permissions',
    title: 'Permissions',
    href: '/admin/permissions',
    icon: 'Shield',
    order: 4,
    adminOnly: true,
  },
  {
    id: 'admin-units',
    title: 'Units Management',
    href: '/admin/units',
    icon: 'LayoutDashboard',
    order: 5,
    adminOnly: true,
  },
  {
    id: 'admin-tool-requests',
    title: 'Tool Access Requests',
    href: '/admin/tool-requests',
    icon: 'Target',
    order: 6,
    adminOnly: true,
  },
  {
    id: 'admin-analytics',
    title: 'Analytics',
    href: '/admin/analytics',
    icon: 'TrendingUp',
    order: 8,
    adminOnly: true,
  },
  {
    id: 'admin-activity-logs',
    title: 'Activity Logs',
    href: '/admin/activity-logs',
    icon: 'FileText',
    order: 9,
    adminOnly: true,
  },
  {
    id: 'admin-notifications',
    title: 'Notifications',
    href: '/admin/notifications',
    icon: 'Mail',
    order: 10,
    adminOnly: true,
  },
  {
    id: 'admin-security',
    title: 'Security Settings',
    href: '/admin/security',
    icon: 'Shield',
    order: 11,
    adminOnly: true,
  },
  {
    id: 'admin-support',
    title: 'Support Tickets',
    href: '/admin/support',
    icon: 'HelpCircle',
    order: 12,
    adminOnly: true,
  },
  {
    id: 'admin-email-templates',
    title: 'Email Templates',
    href: '/admin/email-templates',
    icon: 'Mail',
    order: 13,
    adminOnly: true,
  },
];

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = (session.user as any)?.id;
    const userRole = (session.user as any)?.role;

    // Check if requesting admin-only tools
    const { searchParams } = new URL(request.url);
    const isAdminContext = searchParams.get('context') === 'admin';

    // Get accessible tool paths from database
    const accessibleToolPaths = await getAccessibleTools(userId);

    // If in admin context, only show admin-related tools
    if (isAdminContext && userRole === 'admin') {
      const adminTools = ALL_TOOLS.filter(tool => tool.adminOnly);
      return NextResponse.json({
        success: true,
        tools: adminTools,
        userRole,
        context: 'admin',
      });
    }

    // Filter tools based on permissions (normal dashboard context)
    const filteredTools = ALL_TOOLS.filter(tool => {
      // Don't show admin panel in normal dashboard
      if (tool.adminOnly) {
        return false;
      }

      // Always show home and other always visible tools
      if (tool.alwaysVisible) {
        return true;
      }

      // Tools requiring permission check
      if (tool.requiresPermission) {
        // Admin has access to all
        if (userRole === 'admin') {
          return true;
        }
        // Check if tool path is in accessible list
        return accessibleToolPaths.includes(tool.href) || accessibleToolPaths.includes('*');
      }

      return true;
    });

    // Sort by order
    const sortedTools = filteredTools.sort((a, b) => a.order - b.order);

    return NextResponse.json({
      success: true,
      tools: sortedTools,
      userRole,
      context: 'normal',
    });
  } catch (error) {
    console.error('[User API] Error fetching accessible tools:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
