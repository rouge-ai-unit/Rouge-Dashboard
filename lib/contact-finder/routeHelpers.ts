// Shared error mapping for the contact-finder API routes.

import { NextResponse } from 'next/server';

/** Maps a thrown Hunter client error to an HTTP JSON response. */
export function hunterErrorResponse(error: unknown, logPrefix: string) {
  console.error(logPrefix, error);

  if (error instanceof Error) {
    if (error.message.includes('HUNTER_API_KEY')) {
      return NextResponse.json(
        { success: false, message: 'Hunter.io API is not configured. Please contact the administrator.' },
        { status: 500 }
      );
    }
    if (error.message.includes('Invalid Hunter.io API key')) {
      return NextResponse.json(
        { success: false, message: 'Invalid API key. Please contact the administrator.' },
        { status: 500 }
      );
    }
    if (error.message.includes('limit reached') || error.message.includes('rate limit')) {
      return NextResponse.json(
        { success: false, message: 'Hunter.io request limit reached. Please try again later.' },
        { status: 429 }
      );
    }
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { success: false, message: 'An unexpected error occurred. Please try again.' },
    { status: 500 }
  );
}
