-- ============================================================================
-- ETAPA 4 - COMUNIDADE + CONTEUDO
-- Projeto: ZeroApp
-- Objetivo: limpar policies duplicadas, expandir tiers de conteudo e criar base
--           de comunidade (feed + desafios semanais)
-- Observacao: script idempotente e compativel com schema atual
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------------
-- 0.1 Limpeza definitiva de policies antigas duplicadas de mavf_objectives
-- --------------------------------------------------------------------------
DROP POLICY IF EXISTS "mavf_objectives_admin_select_all" ON public.mavf_objectives;
DROP POLICY IF EXISTS "mavf_objectives_admin_update_all" ON public.mavf_objectives;
DROP POLICY IF EXISTS "mavf_objectives_delete_own" ON public.mavf_objectives;
DROP POLICY IF EXISTS "mavf_objectives_insert_own" ON public.mavf_objectives;
DROP POLICY IF EXISTS "mavf_objectives_select_own" ON public.mavf_objectives;
DROP POLICY IF EXISTS "mavf_objectives_update_own" ON public.mavf_objectives;

-- --------------------------------------------------------------------------
-- 0.2 Expandir constraint tier_required e RLS de member_area_content
-- --------------------------------------------------------------------------
ALTER TABLE public.member_area_content
  DROP CONSTRAINT IF EXISTS member_area_content_tier_required_check;

ALTER TABLE public.member_area_content
  ADD CONSTRAINT member_area_content_tier_required_check
  CHECK (tier_required IN ('LIVRE', 'MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO'));

DROP POLICY IF EXISTS member_content_read ON public.member_area_content;

CREATE POLICY member_content_read ON public.member_area_content
  FOR SELECT
  USING (
    is_published = true
    AND (
      tier_required = 'LIVRE'
      OR (
        tier_required = 'MOVIMENTO'
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
            AND tier IN ('MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO')
        )
      )
      OR (
        tier_required = 'ACELERACAO'
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
            AND tier IN ('ACELERACAO', 'AUTOGOVERNO')
        )
      )
      OR (
        tier_required = 'AUTOGOVERNO'
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
            AND tier = 'AUTOGOVERNO'
        )
      )
    )
  );

-- --------------------------------------------------------------------------
-- 0.3 feed_events
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feed_events (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type    text        NOT NULL CHECK (event_type IN (
    'month_complete',
    'goal_reached',
    'achievement_unlocked',
    'gain_grande',
    'gratitude_streak_7',
    'gratitude_streak_30',
    'tier_upgrade',
    'identity_registered',
    'workshop_redeemed'
  )),
  title         text        NOT NULL,
  body          text,
  metadata      jsonb       NOT NULL DEFAULT '{}',
  is_visible    boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feed_events_created
  ON public.feed_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feed_events_user
  ON public.feed_events(user_id, created_at DESC);

ALTER TABLE public.feed_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feed_read ON public.feed_events;
DROP POLICY IF EXISTS feed_write_own ON public.feed_events;
DROP POLICY IF EXISTS feed_update_own ON public.feed_events;
DROP POLICY IF EXISTS feed_admin ON public.feed_events;

CREATE POLICY feed_read ON public.feed_events
  FOR SELECT
  USING (is_visible = true AND auth.uid() IS NOT NULL);

CREATE POLICY feed_write_own ON public.feed_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY feed_update_own ON public.feed_events
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY feed_admin ON public.feed_events
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------------
-- 0.4 feed_reactions
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.feed_reactions (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id    uuid        NOT NULL REFERENCES public.feed_events(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_event
  ON public.feed_reactions(event_id);

ALTER TABLE public.feed_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reactions_read ON public.feed_reactions;
DROP POLICY IF EXISTS reactions_write ON public.feed_reactions;
DROP POLICY IF EXISTS reactions_delete ON public.feed_reactions;
DROP POLICY IF EXISTS reactions_admin ON public.feed_reactions;

CREATE POLICY reactions_read ON public.feed_reactions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY reactions_write ON public.feed_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY reactions_delete ON public.feed_reactions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY reactions_admin ON public.feed_reactions
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------------
-- 0.5 weekly_challenges + participations
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_challenges (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         text        NOT NULL,
  descricao     text        NOT NULL,
  meta          integer     NOT NULL,
  coins_bonus   integer     NOT NULL DEFAULT 0,
  starts_at     timestamptz NOT NULL,
  ends_at       timestamptz NOT NULL,
  is_active     boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.weekly_challenge_participations (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  challenge_id  uuid        NOT NULL REFERENCES public.weekly_challenges(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_challenge_participations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS challenges_read ON public.weekly_challenges;
DROP POLICY IF EXISTS challenges_admin ON public.weekly_challenges;
DROP POLICY IF EXISTS participations_read ON public.weekly_challenge_participations;
DROP POLICY IF EXISTS participations_write ON public.weekly_challenge_participations;
DROP POLICY IF EXISTS participations_admin ON public.weekly_challenge_participations;

CREATE POLICY challenges_read ON public.weekly_challenges
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY challenges_admin ON public.weekly_challenges
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY participations_read ON public.weekly_challenge_participations
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY participations_write ON public.weekly_challenge_participations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY participations_admin ON public.weekly_challenge_participations
  FOR ALL USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------------
-- 0.6 Verificacoes finais
-- --------------------------------------------------------------------------
DO $$
DECLARE
  v_tables_count integer;
  v_policy_count integer;
BEGIN
  SELECT COUNT(*) INTO v_tables_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'feed_events',
      'feed_reactions',
      'weekly_challenges',
      'weekly_challenge_participations'
    );

  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'mavf_objectives';

  RAISE NOTICE 'Etapa 4 SQL: %/4 tabelas de comunidade encontradas.', v_tables_count;
  RAISE NOTICE 'Etapa 4 SQL: % policies em mavf_objectives (esperado: 6).', v_policy_count;
END $$;

COMMIT;
