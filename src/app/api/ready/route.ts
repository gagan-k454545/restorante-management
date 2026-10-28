import { NextResponse } from 'next/server';
import { db } from '@/db/client';
import { sql } from 'drizzle-orm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: 'ready', database: 'connected' });
  } catch (error) {
    return NextResponse.json(
      { status: 'unready', database: 'disconnected', error: String(error) },
      { status: 503 }
    );
  }
}
