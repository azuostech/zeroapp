import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';

export async function POST(_request, { params }) {
  const supabase = await createServerSupabase();
  const { user } = await getCurrentProfile(supabase);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const resolvedParams = await params;
  const contentId = String(resolvedParams?.id || '').trim();
  if (!contentId) return NextResponse.json({ error: 'invalid_content_id' }, { status: 400 });

  const now = new Date().toISOString();
  const { data: existing } = await supabase
    .from('content_progress')
    .select('completed_at')
    .eq('user_id', user.id)
    .eq('content_id', contentId)
    .maybeSingle();

  const { data, error } = await supabase
    .from('content_progress')
    .upsert(
      {
        user_id: user.id,
        content_id: contentId,
        started_at: now,
        completed_at: now
      },
      { onConflict: 'user_id,content_id' }
    )
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message || 'progress_complete_failed' }, { status: 500 });
  }

  let coinsAwarded = 0;
  if (!existing?.completed_at) {
    try {
      const serviceSupabase = getServiceSupabase();
      await serviceSupabase.rpc('award_coins', {
        p_user_id: user.id,
        p_amount: 15,
        p_action_type: 'content_completed',
        p_description: 'Aula concluída',
        p_metadata: { content_id: contentId }
      });
      coinsAwarded = 15;
    } catch (awardError) {
      console.error('[content-progress] award_coins failed:', awardError);
    }
  }

  return NextResponse.json({ progress: data, completed: true, coins_awarded: coinsAwarded, success: true });
}

export async function DELETE(_request, { params }) {
  const supabase = await createServerSupabase();
  const { user } = await getCurrentProfile(supabase);
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const resolvedParams = await params;
  const contentId = String(resolvedParams?.id || '').trim();
  if (!contentId) return NextResponse.json({ error: 'invalid_content_id' }, { status: 400 });

  const { error } = await supabase
    .from('content_progress')
    .update({ completed_at: null })
    .eq('user_id', user.id)
    .eq('content_id', contentId);

  if (error) {
    return NextResponse.json({ error: error.message || 'progress_uncomplete_failed' }, { status: 500 });
  }

  return NextResponse.json({ uncompleted: true });
}
