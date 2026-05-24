-- ============================================================================
-- AJUSTE 4D - CONTEUDO POR TURMA E DATA
-- Projeto: ZeroApp
-- Objetivo: habilitar turma_exclusiva + disponivel_em sem regressao
-- Observacao: script idempotente
-- ============================================================================

BEGIN;

-- --------------------------------------------------------------------------
-- 0.1 Novas colunas em member_area_content
-- --------------------------------------------------------------------------
ALTER TABLE public.member_area_content
  ADD COLUMN IF NOT EXISTS turma_exclusiva text,
  ADD COLUMN IF NOT EXISTS disponivel_em date;

-- --------------------------------------------------------------------------
-- 0.2 Indices para consulta por turma/data
-- --------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_content_turma
  ON public.member_area_content (turma_exclusiva)
  WHERE turma_exclusiva IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_content_disponivel
  ON public.member_area_content (disponivel_em)
  WHERE disponivel_em IS NOT NULL;

-- --------------------------------------------------------------------------
-- 0.3 RLS de leitura com regra de turma
-- Nota: disponivel_em NAO entra no RLS (bloqueio por data fica na API)
-- --------------------------------------------------------------------------
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
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.tier IN ('MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO')
        )
      )
      OR (
        tier_required = 'ACELERACAO'
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.tier IN ('ACELERACAO', 'AUTOGOVERNO')
        )
      )
      OR (
        tier_required = 'AUTOGOVERNO'
        AND EXISTS (
          SELECT 1
          FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.tier = 'AUTOGOVERNO'
        )
      )
    )
    AND (
      turma_exclusiva IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND p.turma = member_area_content.turma_exclusiva
      )
    )
  );

-- --------------------------------------------------------------------------
-- 0.4 Verificacao final
-- --------------------------------------------------------------------------
DO $$
DECLARE
  v_has_turma boolean;
  v_has_data boolean;
  v_policy_count integer;
  v_total_content integer;
  v_com_turma integer;
  v_com_data integer;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'member_area_content'
      AND column_name = 'turma_exclusiva'
  ) INTO v_has_turma;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'member_area_content'
      AND column_name = 'disponivel_em'
  ) INTO v_has_data;

  SELECT COUNT(*)
  INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'member_area_content'
    AND policyname = 'member_content_read'
    AND cmd = 'SELECT';

  SELECT COUNT(*) INTO v_total_content
  FROM public.member_area_content;

  SELECT COUNT(*) INTO v_com_turma
  FROM public.member_area_content
  WHERE turma_exclusiva IS NOT NULL;

  SELECT COUNT(*) INTO v_com_data
  FROM public.member_area_content
  WHERE disponivel_em IS NOT NULL;

  RAISE NOTICE 'Ajuste 4D SQL: coluna turma_exclusiva = %', v_has_turma;
  RAISE NOTICE 'Ajuste 4D SQL: coluna disponivel_em = %', v_has_data;
  RAISE NOTICE 'Ajuste 4D SQL: policy member_content_read SELECT = %', v_policy_count;
  RAISE NOTICE 'Ajuste 4D SQL: total conteudos = %', v_total_content;
  RAISE NOTICE 'Ajuste 4D SQL: conteudos com turma_exclusiva = %', v_com_turma;
  RAISE NOTICE 'Ajuste 4D SQL: conteudos com disponivel_em = %', v_com_data;
END $$;

COMMIT;
