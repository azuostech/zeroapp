-- ============================================================================
-- CONTEUDO - ACESSO POR MULTIPLAS TURMAS
-- Projeto: ZeroApp
-- Objetivo: permitir profiles.turma com lista separada por virgula/ponto-e-virgula
-- Exemplo: "Maio 2026, Workshop" acessa conteudos de "Maio 2026" e "Workshop".
-- Script idempotente.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.profile_has_turma(user_turmas text, required_turma text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    NULLIF(btrim(COALESCE(required_turma, '')), '') IS NULL
    OR EXISTS (
      SELECT 1
      FROM regexp_split_to_table(COALESCE(user_turmas, ''), '[[:space:]]*[,;][[:space:]]*') AS turma_item
      WHERE lower(btrim(turma_item)) = lower(btrim(required_turma))
    );
$$;

REVOKE ALL ON FUNCTION public.profile_has_turma(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_has_turma(text, text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS programs_read ON public.content_programs;

CREATE POLICY programs_read ON public.content_programs
  FOR SELECT
  USING (
    is_published = true
    AND visibility != 'hidden'
    AND (
      tier_required = 'LIVRE'
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (
            (content_programs.tier_required = 'MOVIMENTO' AND p.tier IN ('MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO'))
            OR (content_programs.tier_required = 'ACELERACAO' AND p.tier IN ('ACELERACAO', 'AUTOGOVERNO'))
            OR (content_programs.tier_required = 'AUTOGOVERNO' AND p.tier = 'AUTOGOVERNO')
          )
      )
    )
    AND (
      turma_exclusiva IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND public.profile_has_turma(p.turma, content_programs.turma_exclusiva)
      )
    )
  );

DROP POLICY IF EXISTS sessions_read ON public.content_sessions;

CREATE POLICY sessions_read ON public.content_sessions
  FOR SELECT
  USING (
    visibility != 'hidden'
    AND EXISTS (
      SELECT 1
      FROM public.content_programs p
      WHERE p.id = content_sessions.program_id
        AND p.is_published = true
        AND p.visibility != 'hidden'
        AND (
          p.tier_required = 'LIVRE'
          OR EXISTS (
            SELECT 1
            FROM public.profiles pr
            WHERE pr.id = auth.uid()
              AND (
                (p.tier_required = 'MOVIMENTO' AND pr.tier IN ('MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO'))
                OR (p.tier_required = 'ACELERACAO' AND pr.tier IN ('ACELERACAO', 'AUTOGOVERNO'))
                OR (p.tier_required = 'AUTOGOVERNO' AND pr.tier = 'AUTOGOVERNO')
              )
          )
        )
        AND (
          p.turma_exclusiva IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.profiles pr
            WHERE pr.id = auth.uid()
              AND public.profile_has_turma(pr.turma, p.turma_exclusiva)
          )
        )
    )
  );

DROP POLICY IF EXISTS member_content_read ON public.member_area_content;

CREATE POLICY member_content_read ON public.member_area_content
  FOR SELECT
  USING (
    is_published = true
    AND visibility != 'hidden'
    AND (
      tier_required = 'LIVRE'
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND (
            (member_area_content.tier_required = 'MOVIMENTO' AND p.tier IN ('MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO'))
            OR (member_area_content.tier_required = 'ACELERACAO' AND p.tier IN ('ACELERACAO', 'AUTOGOVERNO'))
            OR (member_area_content.tier_required = 'AUTOGOVERNO' AND p.tier = 'AUTOGOVERNO')
          )
      )
    )
    AND (
      turma_exclusiva IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = auth.uid()
          AND public.profile_has_turma(p.turma, member_area_content.turma_exclusiva)
      )
    )
  );

DO $$
DECLARE
  v_user_turma text;
  v_workshop_ok boolean;
  v_maio_ok boolean;
  v_policy_count integer;
BEGIN
  SELECT turma
  INTO v_user_turma
  FROM public.profiles
  WHERE lower(email) = lower('sza.treinamentos@gmail.com')
  LIMIT 1;

  SELECT public.profile_has_turma(v_user_turma, 'Workshop')
  INTO v_workshop_ok;

  SELECT public.profile_has_turma(v_user_turma, 'Maio 2026')
  INTO v_maio_ok;

  SELECT COUNT(*)
  INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname IN ('programs_read', 'sessions_read', 'member_content_read');

  RAISE NOTICE 'Multiturma: turma usuario teste = %', v_user_turma;
  RAISE NOTICE 'Multiturma: acesso Workshop = %', v_workshop_ok;
  RAISE NOTICE 'Multiturma: acesso Maio 2026 = %', v_maio_ok;
  RAISE NOTICE 'Multiturma: policies recriadas = %', v_policy_count;
END $$;

COMMIT;
