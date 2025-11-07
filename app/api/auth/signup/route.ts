import { NextRequest, NextResponse } from 'next/server';
import { signupSchema } from '@/utils/auth-schema';
import { createUser, isRougeEmail, getEmailRejectionReason, logAuditEvent, createApprovalQueueEntry } from '@/lib/auth/auth-service';
import { sendWelcomeEmail, sendPendingApprovalEmail, sendAdminNewUserNotification } from '@/lib/auth/email-service';
import { notifyNewSignup } from '@/lib/notifications/notification-service';

/**
 * POST /api/auth/signup
 * Register a new user (Rouge emails only)
 * New users require approval from AI Unit admins
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = signupSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }
    
    const { email, password, firstName, lastName, requestedUnit, requestedRole, signupJustification } = validationResult.data;
    
    // Check if Rouge email
    if (!isRougeEmail(email)) {
      const rejectionReason = getEmailRejectionReason(email);
      
      // Log rejected signup attempt
      await logAuditEvent({
        eventType: 'signup_rejected',
        eventCategory: 'auth',
        eventStatus: 'failure',
        email,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        message: 'Signup rejected - not a Rouge email',
        errorMessage: rejectionReason,
      });
      
      return NextResponse.json(
        { error: rejectionReason },
        { status: 403 }
      );
    }
    
    // Create user (status will be 'pending' for manual signups)
    const user = await createUser({
      email,
      password,
      firstName,
      lastName,
      requestedUnit,
      requestedRole,
      signupJustification,
    });
    
    // Create approval queue entry
    await createApprovalQueueEntry({
      userId: user.id,
      requestedRole,
      requestedUnit,
      justification: signupJustification,
    });
    
    // Send pending approval email to user (non-blocking)
    sendPendingApprovalEmail(email, `${firstName} ${lastName}`).catch(err => {
      console.error('[Signup] Failed to send pending approval email:', err);
    });
    
    // Send notification to admins about new signup (non-blocking)
    sendAdminNewUserNotification({
      email,
      name: `${firstName} ${lastName}`,
      requestedUnit,
      requestedRole,
      justification: signupJustification,
    }).catch(err => {
      console.error('[Signup] Failed to send admin notification:', err);
    });
    
    // Create in-app notification for admins (non-blocking)
    notifyNewSignup(user.id, email, requestedRole).catch(err => {
      console.error('[Signup] Failed to create admin notification:', err);
    });
    
    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Your registration is pending approval from the AI Unit. You will receive an email once your account is approved.',
      requiresApproval: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
      },
    }, { status: 201 });
    
  } catch (error) {
    console.error('[Signup API] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An error occurred during signup';
    
    // Log error
    await logAuditEvent({
      eventType: 'signup_error',
      eventCategory: 'auth',
      eventStatus: 'failure',
      message: 'Signup error',
      errorMessage,
    });
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
