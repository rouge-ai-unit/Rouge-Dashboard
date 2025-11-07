/**
 * API Route: Request Tool Access
 * Allows users to request access to restricted tools
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/middleware/apiAuth';
import { createToolAccessRequest } from '@/lib/auth/auth-service';
import { notifyNewToolRequest } from '@/lib/notifications/notification-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const auth = await getAuthenticatedUser(request);
    if (!auth.authenticated) {
      return auth.response!;
    }

    // Parse request body
    const body = await request.json();
    const { toolName, toolPath, justification } = body;

    // Validate input
    if (!toolName || !toolPath || !justification) {
      return NextResponse.json(
        { error: 'Tool name, path, and justification are required' },
        { status: 400 }
      );
    }

    if (justification.length < 20) {
      return NextResponse.json(
        { error: 'Justification must be at least 20 characters' },
        { status: 400 }
      );
    }

    if (justification.length > 1000) {
      return NextResponse.json(
        { error: 'Justification must be less than 1000 characters' },
        { status: 400 }
      );
    }

    // Create tool access request
    const requestId = await createToolAccessRequest({
      userId: auth.userId!,
      toolName,
      toolPath,
      justification,
    });
    
    // Get user session for email
    const session = await getServerSession(authOptions);
    const userEmail = (session?.user as any)?.email || 'Unknown';
    
    // Notify admins (non-blocking)
    notifyNewToolRequest(
      auth.userId!,
      userEmail,
      toolName,
      requestId
    ).catch(err => {
      console.error('[Tool Access API] Failed to send notification:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'Tool access request submitted successfully'
    });
  } catch (error) {
    console.error('[Tool Access API] Error creating request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
