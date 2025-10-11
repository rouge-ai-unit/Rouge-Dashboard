import { NextRequest, NextResponse } from 'next/server';
import { signupSchema } from '@/utils/auth-schema';
import { createUser, isRougeEmail, getEmailRejectionReason, logAuditEvent } from '@/lib/auth/auth-service';
import { sendWelcomeEmail } from '@/lib/auth/email-service';

/**
 * POST /api/auth/signup
 * Register a new user (Rouge emails only)
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
    
    const { email, password, firstName, lastName } = validationResult.data;
    
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
    
    // Create user
    const user = await createUser({
      email,
      password,
      firstName,
      lastName,
    });
    
    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, `${firstName} ${lastName}`).catch(err => {
      console.error('[Signup] Failed to send welcome email:', err);
    });
    
    return NextResponse.json({
      success: true,
      message: 'Account created successfully. Please sign in.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
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
