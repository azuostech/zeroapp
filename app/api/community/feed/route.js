import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';

function parsePositiveLimit(value, fallback = 20, max = 60) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(max, Math.floor(parsed));
}

function resolveDisplayName({ full_name, email }, fallback = 'Mentorado') {
  const explicit = String(full_name || '').trim();
  if (explicit) return explicit;

  const safeEmail = String(email || '').trim().toLowerCase();
  if (safeEmail && safeEmail.includes('@')) {
    const localPart = safeEmail
      .split('@')[0]
      .replace(/[._-]+/g, ' ')
      .trim();

    if (localPart) {
      return localPart
        .split(/\s+/)
        .filter(Boolean)
        .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
        .join(' ');
    }
  }

  return fallback;
}

function toAuthorMap(rows) {
  const map = new Map();
  (rows || []).forEach((row) => {
    map.set(row.id, {
      full_name: resolveDisplayName(row),
      tier: row.tier || 'DESPERTAR'
    });
  });
  return map;
}

export async function GET(request) {
  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = parsePositiveLimit(searchParams.get('limit'), 20, 50);
  const before = String(searchParams.get('before') || '').trim();
  const turmaUsuario = String(profile?.turma || '').trim() || null;

  let query = supabase
    .from('feed_events')
    .select('id,event_type,title,body,metadata,created_at,user_id,turma')
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (turmaUsuario) {
    query = query.eq('turma', turmaUsuario);
  }

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data: events, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message || 'community_feed_failed' }, { status: 500 });
  }

  const safeEvents = Array.isArray(events) ? events : [];
  const eventIds = safeEvents.map((event) => event.id);
  const authorIds = [...new Set(safeEvents.map((event) => event.user_id).filter(Boolean))];

  let reactions = [];
  if (eventIds.length > 0) {
    const { data: reactionRows, error: reactionsError } = await supabase
      .from('feed_reactions')
      .select('event_id,user_id')
      .in('event_id', eventIds);

    if (reactionsError) {
      return NextResponse.json({ error: reactionsError.message || 'community_reactions_load_failed' }, { status: 500 });
    }

    reactions = reactionRows || [];
  }

  const reactionsByEvent = new Map();
  reactions.forEach((row) => {
    const list = reactionsByEvent.get(row.event_id) || [];
    list.push(row.user_id);
    reactionsByEvent.set(row.event_id, list);
  });

  let authorMap = new Map();
  if (authorIds.length > 0) {
    const serviceSupabase = getServiceSupabase();
    const { data: profiles, error: profilesError } = await serviceSupabase
      .from('profiles')
      .select('id,full_name,email,tier')
      .in('id', authorIds);

    if (!profilesError) {
      authorMap = toAuthorMap(profiles || []);
    }
  }

  const enriched = safeEvents.map((event) => {
    const userIds = reactionsByEvent.get(event.id) || [];
    const metadata = event.metadata && typeof event.metadata === 'object' ? event.metadata : {};
    const fallbackName = String(metadata.author_name || '').trim() || 'Mentorado';
    const fallbackTier = String(metadata.author_tier || 'DESPERTAR').toUpperCase();
    const author = authorMap.get(event.user_id) || null;
    const authorName = author?.full_name || fallbackName;
    const authorTier = String(author?.tier || fallbackTier).toUpperCase();

    return {
      id: event.id,
      event_type: event.event_type,
      title: event.title,
      body: event.body,
      metadata: event.metadata || {},
      created_at: event.created_at,
      user_id: event.user_id,
      turma: event.turma || null,
      reaction_count: userIds.length,
      user_reacted: userIds.includes(user.id),
      author_name: authorName,
      author_tier: authorTier
    };
  });

  return NextResponse.json({
    events: enriched,
    turma: turmaUsuario,
    has_more: safeEvents.length === limit,
    next_cursor: safeEvents.length > 0 ? safeEvents[safeEvents.length - 1].created_at : null
  });
}
