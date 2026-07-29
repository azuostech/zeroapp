import { NextResponse } from 'next/server';
import { findOrCreateDiagnostic, getIrcRequestContext, serializeDiagnostic } from '@/src/modules/irc/application/irc-access';
import { publicDomainTree, IRC_TOTAL_STEPS } from '@/src/modules/irc/domain/irc-domains';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const context = await getIrcRequestContext();
    if (!context.ok) {
      return NextResponse.json({ error: context.error }, { status: context.status });
    }

    const diagnostic = await findOrCreateDiagnostic(context);
    return NextResponse.json({
      diagnostic: serializeDiagnostic(diagnostic),
      profile: {
        first_name: String(context.profile.full_name || context.profile.email || 'Você').trim().split(/\s+/)[0]
      },
      domains: publicDomainTree(),
      total_steps: IRC_TOTAL_STEPS
    });
  } catch (error) {
    console.error('[irc/diagnostic] load failed:', error?.message || error);
    return NextResponse.json({ error: 'diagnostic_load_failed' }, { status: 500 });
  }
}
