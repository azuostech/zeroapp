import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';
import { calculateStreak, countSinceDays } from '@/src/modules/mavf/application/practices-utils';

export async function GET(request) {
  const supabase = await createServerSupabase();
  const { searchParams } = new URL(request.url);
  const requestedUserId = searchParams.get('user_id');

  const context = await resolveImpersonationContext({
    supabase,
    requestedUserId
  });

  if (!context.ok) {
    return NextResponse.json({ error: context.error }, { status: context.status });
  }

  const userId = context.targetUserId;

  const [gainsRes, gratitudeRes, identityRes, objectivesRes] = await Promise.all([
    supabase.from('gains').select('id, tamanho, created_at, descricao').eq('user_id', userId).order('created_at', { ascending: false }).limit(100),
    supabase
      .from('gratitude_entries')
      .select('id, categoria, created_at, descricao')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('identity_declarations')
      .select('id, declaracao, encontro_ref, contexto, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase.from('mavf_objectives').select('id, progress').eq('user_id', userId)
  ]);

  const firstError = [gainsRes.error, gratitudeRes.error, identityRes.error, objectivesRes.error].find(Boolean);
  if (firstError) {
    return NextResponse.json({ error: firstError.message || 'Erro ao montar resumo MAVF' }, { status: 500 });
  }

  const gains = gainsRes.data || [];
  const gratitude = gratitudeRes.data || [];
  const identity = identityRes.data || [];
  const objectives = objectivesRes.data || [];

  const gainsSemana = countSinceDays(gains, 7);
  const streak = calculateStreak(gratitude);
  const emProgresso = objectives.filter((item) => Number(item.progress) > 0 && Number(item.progress) < 100).length;

  return NextResponse.json({
    gains: {
      total: gains.length,
      semana: gainsSemana,
      ultimo: gains[0] || null
    },
    gratitude: {
      total: gratitude.length,
      streak,
      ultimo: gratitude[0] || null
    },
    identity: {
      total: identity.length,
      ultima: identity.length > 0 ? identity[identity.length - 1] : null,
      manifesto: identity
    },
    mavf_objectives: {
      total: objectives.length,
      em_progresso: emProgresso
    }
  });
}
