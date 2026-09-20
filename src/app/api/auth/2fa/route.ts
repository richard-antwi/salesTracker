import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({ error: '2FA feature has been temporarily disabled' }, { status: 400 });
}
