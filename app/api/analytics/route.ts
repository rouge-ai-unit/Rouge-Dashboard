import { NextResponse } from 'next/server';
import { getRealtimeUsers } from '@/app/lib/ga';

export async function GET() {
  const data = await getRealtimeUsers('452314459'); // Replace with your property ID
  return NextResponse.json(data);
}
