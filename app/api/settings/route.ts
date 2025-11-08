import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { simpleRateLimit } from '@/lib/rate-limit';
import { getUserSettings, updateUserSettings, validateUserSettings } from '@/lib/settings';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Settings API] Fetching settings for user:', session.user.id);

    // Rate limiting - wrap in try-catch to not block if rate limit fails
    try {
      const rateLimitResult = await simpleRateLimit(session.user.id, 'settings_read', 60);
      if (!rateLimitResult.success) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }
    } catch (rateLimitError) {
      console.warn('Rate limit check failed, continuing:', rateLimitError);
    }

    // Get user profile data to pre-populate settings
    const { findUserById } = await import('@/lib/auth/auth-service');
    const user = await findUserById(session.user.id);
    
    console.log('[Settings API] User profile:', user ? {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      unit: user.unit,
      role: user.role
    } : 'not found');

    // Get or create settings
    let settings = await getUserSettings(session.user.id);
    
    // If settings don't exist or profile is empty, create/update with user data
    if (!settings || !settings.profile?.firstName) {
      console.log('[Settings API] Creating/updating settings with user profile data');
      
      const settingsData = {
        profile: {
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          company: '',
          role: user?.unit || '',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
          avatar: user?.avatar || '',
        },
        notifications: settings?.notifications || {
          email: true,
          push: true,
          sound: false,
          pollInterval: 30,
          ticketUpdates: true,
          workTracker: true,
          campaignUpdates: true,
          contactUpdates: true,
        },
        security: settings?.security || {
          twoFactorEnabled: false,
          sessionTimeout: 60,
          apiKeys: [],
        },
        integrations: settings?.integrations || {
          sendgrid: { verified: false },
          googleSheets: { connected: false },
          notion: { connected: false },
          linkedin: { connected: false },
        },
        coldOutreach: settings?.coldOutreach || {
          defaultCampaignSettings: {
            dailyLimit: 50,
            followUpDelay: 3,
            maxFollowUps: 5,
          },
          emailTemplates: {
            defaultSubject: 'Following up on our conversation',
            defaultSignature: 'Best regards,\n[Your Name]',
          },
          crmSync: {
            autoSync: false,
            syncInterval: 6,
          },
        },
        system: settings?.system || {
          theme: 'system' as const,
          language: 'en',
          dateFormat: 'MM/dd/yyyy',
          timeFormat: '12h' as const,
          dataRetention: 365,
          exportFormat: 'csv' as const,
        },
      };
      
      settings = await updateUserSettings(session.user.id, settingsData);
      console.log('[Settings API] Settings created/updated successfully');
    }

    console.log('[Settings API] Returning settings');
    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[Settings API] Error fetching settings:', error);
    console.error('[Settings API] Error details:', error instanceof Error ? error.message : String(error));
    console.error('[Settings API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      { error: 'Failed to fetch settings', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await simpleRateLimit(session.user.id, 'settings_write', 30);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Validate input using the validation function
    const validation = validateUserSettings(body);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      );
    }

    // Sanitize input
    const sanitizedData = {
      ...body,
      profile: body.profile ? {
        ...body.profile,
        firstName: body.profile.firstName?.trim(),
        lastName: body.profile.lastName?.trim(),
        company: body.profile.company?.trim(),
        role: body.profile.role?.trim(),
      } : undefined,
      notifications: body.notifications,
      security: body.security ? {
        ...body.security,
        apiKeys: body.security.apiKeys || []
      } : undefined,
      integrations: body.integrations,
      coldOutreach: body.coldOutreach,
      system: body.system,
    };

    const settings = await updateUserSettings(session.user.id, sanitizedData);

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error updating settings:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
