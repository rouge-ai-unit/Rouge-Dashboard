import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { simpleRateLimit } from '@/lib/rate-limit';
import { getUserSettings, updateUserSettings } from '@/lib/settings';
import { settingsSchema } from '@/utils/schema';
import { z } from 'zod';

const updateSettingsSchema = settingsSchema.partial();

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await simpleRateLimit(session.user.id, 'settings_read', 60);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const settings = await getUserSettings(session.user.id);

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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

    // Validate input
    const validatedData = updateSettingsSchema.parse(body);

    // Sanitize input
    const sanitizedData = {
      ...validatedData,
      profile: validatedData.profile ? {
        ...validatedData.profile,
        firstName: validatedData.profile.firstName?.trim(),
        lastName: validatedData.profile.lastName?.trim(),
        company: validatedData.profile.company?.trim(),
        role: validatedData.profile.role?.trim(),
      } : undefined,
      notifications: validatedData.notifications,
      security: validatedData.security ? {
        ...validatedData.security,
        apiKeys: validatedData.security.apiKeys || []
      } : undefined,
      integrations: validatedData.integrations,
      coldOutreach: validatedData.coldOutreach,
      system: validatedData.system,
    };

    const settings = await updateUserSettings(session.user.id, sanitizedData);

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('Error updating settings:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
