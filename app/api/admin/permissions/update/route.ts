/**
 * API Route: Update Permissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDb } from '@/utils/dbConfig';
import { RolePermissions } from '@/utils/auth-schema';
import { eq, and } from 'drizzle-orm';
import { logAdminActivity, logPermissionChange } from '@/lib/auth/auth-service';

// Valid tool paths for validation
const VALID_TOOL_PATHS = [
  '/home',
  '/tools/ai-tools-request-form',
  '/tools/work-tracker',
  '/tools/ai-news-daily',
  '/tools/startup-seeker',
  '/agtech-events',
  '/tools/agritech-universities',
  '/tools/sentiment-analyzer',
  '/tools/content-idea-automation',
  '/tools/cold-connect-automator',
  '/tools/ai-outreach-agent',
  '/tools/contact',
  '/admin/dashboard',
] as const;

// Valid roles
const VALID_ROLES = ['admin', 'leader', 'co-leader', 'member'] as const;

export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user is admin
    const userRole = (session.user as any)?.role;
    const adminId = (session.user as any)?.id;
    
    if (userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { toolPermissions } = body;
    
    if (!toolPermissions || !Array.isArray(toolPermissions)) {
      return NextResponse.json(
        { error: 'Invalid tool permissions data' },
        { status: 400 }
      );
    }
    
    // Validate tool paths
    for (const tool of toolPermissions) {
      if (!tool.toolPath || !VALID_TOOL_PATHS.includes(tool.toolPath)) {
        return NextResponse.json(
          { error: `Invalid tool path: ${tool.toolPath}` },
          { status: 400 }
        );
      }
      
      if (!tool.toolName) {
        return NextResponse.json(
          { error: 'Tool name is required' },
          { status: 400 }
        );
      }
    }
    
    // Get IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    const db = getDb();
    
    // Update permissions for each tool and role
    for (const tool of toolPermissions) {
      const roles = ['admin', 'leader', 'coLeader', 'member'];
      const roleMap: Record<string, string> = {
        'admin': 'admin',
        'leader': 'leader',
        'coLeader': 'co-leader',
        'member': 'member'
      };
      
      for (const roleKey of roles) {
        const roleName = roleMap[roleKey];
        const allowed = tool[roleKey];
        
        // Check if permission exists
        const [existing] = await db
          .select()
          .from(RolePermissions)
          .where(
            and(
              eq(RolePermissions.role, roleName),
              eq(RolePermissions.resource, tool.toolPath),
              eq(RolePermissions.action, 'execute')
            )
          )
          .limit(1);
        
        if (existing) {
          // Only update if value changed
          if (existing.allowed !== allowed) {
            // Update existing permission
            await db
              .update(RolePermissions)
              .set({
                allowed,
                updatedAt: new Date(),
              })
              .where(eq(RolePermissions.id, existing.id));
            
            // Log permission change
            await logPermissionChange({
              adminId,
              role: roleName,
              resource: tool.toolPath,
              action: 'execute',
              changeType: 'updated',
              oldValue: { allowed: existing.allowed },
              newValue: { allowed },
              reason: `Permission updated for ${tool.toolName}`,
              ipAddress,
              userAgent,
            });
          }
        } else {
          // Create new permission
          await db.insert(RolePermissions).values({
            role: roleName,
            resource: tool.toolPath,
            action: 'execute',
            allowed,
            description: `Access to ${tool.toolName}`,
          });
          
          // Log permission creation
          await logPermissionChange({
            adminId,
            role: roleName,
            resource: tool.toolPath,
            action: 'execute',
            changeType: 'created',
            newValue: { allowed },
            reason: `Permission created for ${tool.toolName}`,
            ipAddress,
            userAgent,
          });
        }
      }
    }
    
    // Log admin activity
    await logAdminActivity({
      adminId,
      action: 'update_permissions',
      targetResource: 'tool_permissions',
      newValue: { toolPermissions },
      reason: 'Tool permissions updated',
      ipAddress,
      userAgent,
    });
    
    return NextResponse.json({
      success: true,
      message: 'Permissions updated successfully'
    });
  } catch (error) {
    console.error('[Admin API] Error updating permissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
