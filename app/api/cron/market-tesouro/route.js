import { NextResponse } from 'next/server';
import { isCronRequestAuthorized } from '@/src/lib/security/cron-auth';
import { syncTesouro } from '@/src/modules/investments/application/market-data-service';
export const runtime = 'nodejs';
export const maxDuration = 300;
export async function GET(request) { if (!isCronRequestAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 }); return NextResponse.json(await syncTesouro()); }
export const POST = GET;
