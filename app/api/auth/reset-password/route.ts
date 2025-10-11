import { NextRequest, NextResponse } from 'next/server';
import { resetPasswordSchema } from '@/utils/auth-schema';
import { resetPassword, verifyPasswordResetToken, logAuditEvent } from '@/lib/auth/auth-service';

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validationResult = resetPasswordSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }
    
    const { token, password } = validationResult.data;
    
    // Verify token first
    const user = await verifyPasswordResetToken(token);
    if (!user) {
      await logAuditEvent({
        eventType: 'password_reset_failed',
        eventCategory: 'security',
        eventStatus: 'failure',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        message: 'Invalid or expired reset token',
        errorMessage: 'Token verification failed',
      });
      
      return NextResponse.json(
        { error: 'Invalid or expired reset link. Please request a new one.' },
        { status: 400 }
      );
    }
    
    // Reset password
    await resetPassword(token, password);
    
    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. You can now sign in with your new password.',
    });
    
  } catch (error) {
    console.error('[Reset Password API] Error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'An error occurred';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
