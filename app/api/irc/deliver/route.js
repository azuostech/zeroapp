import { NextResponse } from 'next/server';
import { getIrcRequestContext } from '@/src/modules/irc/application/irc-access';
import { deliverIrcDiagnostic } from '@/src/modules/irc/application/irc-delivery';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST() {
  try {
    const context = await getIrcRequestContext();
    if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });

    const { data: diagnostic, error } = await context.service
      .from('irc_diagnostics')
      .select('*')
      .eq('user_id', context.user.id)
      .maybeSingle();
    if (error) throw error;

    const result = await deliverIrcDiagnostic({
      service: context.service,
      diagnostic,
      profile: context.profile
    });
    return NextResponse.json(result, { status: result.processing ? 202 : (result.status || 200) });
  } catch (error) {
    console.error('[irc/deliver] failed:', error?.message || error);
    return NextResponse.json({ error: 'delivery_failed' }, { status: 500 });
  }
}
