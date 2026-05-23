-- ============================================================================
-- AJUSTE 4D - BACKFILL DE EVENTOS DO FEED
-- Projeto: ZeroApp
-- Objetivo: popular feed_events com eventos historicos ja existentes
--            (ganhos grandes e declaracoes de identidade) de forma idempotente.
-- Marcacao: checkpoint feed_turma_ajuste4d (2026-05-23)
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 0.1 Ganhos grandes -> gain_grande
-- --------------------------------------------------------------------------
INSERT INTO public.feed_events (
  user_id,
  event_type,
  title,
  body,
  metadata,
  is_visible,
  created_at,
  turma
)
SELECT
  g.user_id,
  'gain_grande',
  'Registrou um grande ganho! ⚡',
  g.descricao,
  jsonb_build_object('gain_id', g.id),
  true,
  g.created_at,
  p.turma
FROM public.gains g
JOIN public.profiles p ON p.id = g.user_id
WHERE g.tamanho = 'grande'
  AND NOT EXISTS (
    SELECT 1
    FROM public.feed_events fe
    WHERE fe.event_type = 'gain_grande'
      AND fe.metadata->>'gain_id' = g.id::text
  );

-- --------------------------------------------------------------------------
-- 0.2 Identidade -> identity_registered
-- --------------------------------------------------------------------------
INSERT INTO public.feed_events (
  user_id,
  event_type,
  title,
  body,
  metadata,
  is_visible,
  created_at,
  turma
)
SELECT
  d.user_id,
  'identity_registered',
  'Registrou nova declaracao de identidade 💎',
  d.declaracao,
  jsonb_build_object(
    'declaration_id', d.id,
    'encontro_ref', d.encontro_ref
  ),
  true,
  d.created_at,
  p.turma
FROM public.identity_declarations d
JOIN public.profiles p ON p.id = d.user_id
WHERE NOT EXISTS (
  SELECT 1
  FROM public.feed_events fe
  WHERE fe.event_type = 'identity_registered'
    AND fe.metadata->>'declaration_id' = d.id::text
);

-- --------------------------------------------------------------------------
-- 0.3 Verificacao
-- --------------------------------------------------------------------------
DO $$
DECLARE
  v_total integer;
  v_gain_grande integer;
  v_identity integer;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM public.feed_events;

  SELECT COUNT(*) INTO v_gain_grande
  FROM public.feed_events
  WHERE event_type = 'gain_grande';

  SELECT COUNT(*) INTO v_identity
  FROM public.feed_events
  WHERE event_type = 'identity_registered';

  RAISE NOTICE 'Ajuste 4D SQL: total eventos = %', v_total;
  RAISE NOTICE 'Ajuste 4D SQL: gain_grande = %', v_gain_grande;
  RAISE NOTICE 'Ajuste 4D SQL: identity_registered = %', v_identity;
END $$;

COMMIT;
