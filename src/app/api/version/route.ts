import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    version: '1.0.0',
    buildId: process.env.BUILD_ID || 'dev-build-1.0',
    timestamp: Date.now(),
  });
}
