-- ============================================================================
-- CONTEUDO - CATALOGO SEGURO PARA PROGRAMAS VITRINE
-- Projeto: ZeroApp
-- Objetivo: listar programas publicados/visiveis para vitrine sem depender de
-- service role no runtime e sem expor URLs das aulas bloqueadas.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_content_program_catalog()
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  thumbnail_url text,
  tier_required text,
  turma_exclusiva text,
  visibility text,
  order_index integer,
  sessions_count bigint,
  catalog_total_aulas bigint,
  aula_tiers text[],
  aula_turmas text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.title,
    p.description,
    p.thumbnail_url,
    p.tier_required,
    p.turma_exclusiva,
    p.visibility,
    p.order_index,
    COUNT(DISTINCT s.id)::bigint AS sessions_count,
    COUNT(c.id)::bigint AS catalog_total_aulas,
    COALESCE(
      ARRAY_AGG(DISTINCT c.tier_required)
        FILTER (WHERE c.id IS NOT NULL AND NULLIF(btrim(c.tier_required), '') IS NOT NULL),
      ARRAY[]::text[]
    ) AS aula_tiers,
    COALESCE(
      ARRAY_AGG(DISTINCT c.turma_exclusiva)
        FILTER (WHERE c.id IS NOT NULL AND NULLIF(btrim(c.turma_exclusiva), '') IS NOT NULL),
      ARRAY[]::text[]
    ) AS aula_turmas
  FROM public.content_programs p
  LEFT JOIN public.content_sessions s
    ON s.program_id = p.id
   AND s.visibility != 'hidden'
  LEFT JOIN public.member_area_content c
    ON c.session_id = s.id
   AND c.is_published = true
   AND c.visibility != 'hidden'
  WHERE p.is_published = true
    AND p.visibility != 'hidden'
  GROUP BY
    p.id,
    p.title,
    p.description,
    p.thumbnail_url,
    p.tier_required,
    p.turma_exclusiva,
    p.visibility,
    p.order_index
  ORDER BY p.order_index ASC;
$$;

REVOKE ALL ON FUNCTION public.get_content_program_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_content_program_catalog() TO authenticated;

DO $$
DECLARE
  v_program_count integer;
BEGIN
  SELECT COUNT(*)
  INTO v_program_count
  FROM public.get_content_program_catalog();

  RAISE NOTICE 'Programa vitrine catalog: programas visiveis = %', v_program_count;
END $$;

COMMIT;
