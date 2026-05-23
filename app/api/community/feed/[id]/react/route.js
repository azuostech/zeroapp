import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';

async function readReactionCount(supabase, eventId) {
  const { count, error } = await supabase
    .from('feed_reactions')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', eventId);

  if (error) return 0;
  return Number(count || 0);
}

export async function POST(_request, { params }) {
  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const eventId = String(params?.id || '').trim();
  if (!eventId) {
    return NextResponse.json({ error: 'invalid_event_id' }, { status: 400 });
  }

  const { data: event, error: eventError } = await supabase
    .from('feed_events')
    .select('id,user_id,is_visible')
    .eq('id', eventId)
    .maybeSingle();

  if (eventError) {
    return NextResponse.json({ error: eventError.message || 'feed_event_lookup_failed' }, { status: 500 });
  }

  if (!event || !event.is_visible) {
    return NextResponse.json({ error: 'feed_event_not_found' }, { status: 404 });
  }

  const { data: existing, error: existingError } = await supabase
    .from('feed_reactions')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message || 'feed_reaction_lookup_failed' }, { status: 500 });
  }

  if (existing) {
    const { error: deleteError } = await supabase.from('feed_reactions').delete().eq('id', existing.id);
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message || 'feed_reaction_delete_failed' }, { status: 500 });
    }

    const reactionCount = await readReactionCount(supabase, eventId);
    return NextResponse.json({ reacted: false, reaction_count: reactionCount });
  }

  const { error: insertError } = await supabase.from('feed_reactions').insert({
    event_id: eventId,
    user_id: user.id
  });

  if (insertError) {
    if (String(insertError?.code || '') === '23505') {
      const reactionCount = await readReactionCount(supabase, eventId);
      return NextResponse.json({ reacted: true, reaction_count: reactionCount });
    }

    return NextResponse.json({ error: insertError.message || 'feed_reaction_insert_failed' }, { status: 500 });
  }

  if (event.user_id && event.user_id !== user.id) {
    try {
      const serviceSupabase = getServiceSupabase();
      await serviceSupabase.rpc('award_coins', {
        p_user_id: event.user_id,
        p_amount: 5,
        p_action_type: 'received_reaction',
        p_description: 'Alguem te deu forca! 💪',
        p_metadata: {
          event_id: eventId,
          from_user: user.id,
          source: 'community_feed_reaction'
        }
      });
    } catch (_) {
      // Falha de coins nao invalida a reacao.
    }
  }

  const reactionCount = await readReactionCount(supabase, eventId);
  return NextResponse.json({ reacted: true, reaction_count: reactionCount });
}
