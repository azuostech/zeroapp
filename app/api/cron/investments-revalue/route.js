import { NextResponse } from 'next/server';
import { isCronRequestAuthorized } from '@/src/lib/security/cron-auth';
import { revalueAll, snapshotMonthlyValues } from '@/src/modules/investments/application/investments-valuation-service';
export const runtime = 'nodejs';
export const maxDuration = 300;
export async function GET(request) {
  if (!isCronRequestAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const now = new Date(); const revaluation = await revalueAll(undefined, now.toISOString().slice(0, 10));
  const snapshot = now.getUTCDate() === 1 ? await snapshotMonthlyValues(`${now.toISOString().slice(0, 7)}-01`) : null;
  return NextResponse.json({ revaluation, snapshot });
}
export const POST = GET;
