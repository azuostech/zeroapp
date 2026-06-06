-- ============================================================================
-- AREA DE MEMBROS - ETAPA D
-- Projeto: ZeroApp
-- Objetivo: permitir evento content_completed no feed da comunidade
-- Observacao: executar no Supabase SQL Editor
-- ============================================================================

BEGIN;

ALTER TABLE public.feed_events
  DROP CONSTRAINT IF EXISTS feed_events_event_type_check;

ALTER TABLE public.feed_events
  ADD CONSTRAINT feed_events_event_type_check
  CHECK (event_type IN (
    'month_complete',
    'goal_reached',
    'achievement_unlocked',
    'gain_grande',
    'gain_registered',
    'gratitude_streak_7',
    'gratitude_streak_30',
    'gratitude_registered',
    'tier_upgrade',
    'identity_registered',
    'workshop_redeemed',
    'received_reaction',
    'content_completed'
  ));

NOTIFY pgrst, 'reload schema';

COMMIT;
