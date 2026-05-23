-- ============================================================================
-- AJUSTE 4B - TURMAS NO FEED DA COMUNIDADE
-- Projeto: ZeroApp
-- Objetivo: filtrar feed por turma sem quebrar compatibilidade
-- Observacao: script idempotente
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 0.1 profiles.turma + indice
-- --------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS turma text;

CREATE INDEX IF NOT EXISTS idx_profiles_turma
  ON public.profiles (turma)
  WHERE turma IS NOT NULL;

-- --------------------------------------------------------------------------
-- 0.2 atribuir turma padrao para usuarios ativos sem turma
-- --------------------------------------------------------------------------
UPDATE public.profiles
SET turma = 'Maio 2026'
WHERE status = 'active'
  AND turma IS NULL
  AND COALESCE(role, 'user') <> 'admin';

-- Admin sem turma ve todos os eventos e monitora a comunidade inteira.
UPDATE public.profiles
SET turma = NULL
WHERE role = 'admin'
  AND status = 'active'
  AND turma = 'Maio 2026';

-- --------------------------------------------------------------------------
-- 0.3 feed_events.turma + backfill + indice
-- --------------------------------------------------------------------------
ALTER TABLE public.feed_events
  ADD COLUMN IF NOT EXISTS turma text;

UPDATE public.feed_events fe
SET turma = p.turma
FROM public.profiles p
WHERE fe.user_id = p.id
  AND (fe.turma IS DISTINCT FROM p.turma);

CREATE INDEX IF NOT EXISTS idx_feed_events_turma
  ON public.feed_events (turma, created_at DESC)
  WHERE turma IS NOT NULL;

-- --------------------------------------------------------------------------
-- 0.4 verificacao final
-- --------------------------------------------------------------------------
DO $$
DECLARE
  v_profiles_com_turma integer;
  v_events_com_turma integer;
  v_total_events integer;
BEGIN
  SELECT COUNT(*) INTO v_profiles_com_turma
  FROM public.profiles
  WHERE turma IS NOT NULL;

  SELECT COUNT(*) INTO v_events_com_turma
  FROM public.feed_events
  WHERE turma IS NOT NULL;

  SELECT COUNT(*) INTO v_total_events
  FROM public.feed_events;

  RAISE NOTICE 'Ajuste 4B SQL: profiles com turma = %', v_profiles_com_turma;
  RAISE NOTICE 'Ajuste 4B SQL: events com turma = %', v_events_com_turma;
  RAISE NOTICE 'Ajuste 4B SQL: total events = %', v_total_events;
END $$;

COMMIT;
