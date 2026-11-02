import { NextResponse } from 'next/server';
import { isCronRequestAuthorized } from '@/src/lib/security/cron-auth';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { sendPatrimonyReminders } from '@/src/modules/patrimony/application/patrimony-monthly';
export const runtime = 'nodejs';
export async function GET(request) { if (!isCronRequestAuthorized(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 }); try { return NextResponse.json(await sendPatrimonyReminders(getServiceSupabase())); } catch (error) { return NextResponse.json({ error: error.message || 'patrimony_reminder_failed' }, { status: 500 }); } }
export const POST = GET;
