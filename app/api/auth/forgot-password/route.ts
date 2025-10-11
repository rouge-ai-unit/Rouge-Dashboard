import { NextRequest, NextResponse } from 'next/server';
import { forgotPasswordSchema } from '@/utils/auth-schema';
import { findUserByEmail, createPasswordResetToken, logAuditEvent } from '@/lib/auth/auth-service';
import { sendPasswordResetEmail } from '@/lib/auth/email-service';

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = forgotPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0]?.message || 'Invalid email' },
        { status: 400 }
      );
    }
    
    const { email } = validationResult.data;
    
    // Always return success to prevent email enumeration
    // But only send email if user exists
    const user = await findUserByEmail(email);
    
    if (user) {
      // Create reset token
      const token = await createPasswordResetToken(email);
      
      // Send reset email
      await sendPasswordResetEmail(
        email,
        token,
        user.displayName || `${user.firstName} ${user.lastName}`
      );
      
      // Log event
      await logAuditEvent({
        userId: user.id,
        eventType: 'password_reset_requested',
        eventCategory: 'security',
        eventStatus: 'success',
        email,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        message: 'Password reset email sent',
      });
    } else {
      // Log failed attempt (no user found)
      await logAuditEvent({
        eventType: 'password_reset_failed',
        eventCategory: 'security',
        eventStatus: 'failure',
        email,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        message: 'Password reset requested for non-existent user',
      });
    }
    
    // Always return success message
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link shortly.',
    });
    
  } catch (error) {
    console.error('[Forgot Password API] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    
    return NextResponse.json(
      { error: 'An error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}
