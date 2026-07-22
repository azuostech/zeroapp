-- Identifica estruturalmente o programa usado como blog publico do Portal.
-- O titulo pode ser editado sem interromper a vitrine ou a consulta de artigos.
BEGIN;

ALTER TABLE public.content_programs
  ADD COLUMN IF NOT EXISTS is_public_blog boolean NOT NULL DEFAULT false;

UPDATE public.content_programs
SET is_public_blog = (id = '91954b55-d841-4702-a752-e4483d4bea6d')
WHERE is_public_blog = true
   OR id = '91954b55-d841-4702-a752-e4483d4bea6d';

CREATE UNIQUE INDEX IF NOT EXISTS idx_content_programs_single_public_blog
  ON public.content_programs (is_public_blog)
  WHERE is_public_blog = true;

DROP FUNCTION IF EXISTS public.get_content_program_catalog();

CREATE FUNCTION public.get_content_program_catalog()
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  thumbnail_url text,
  tier_required text,
  turma_exclusiva text,
  is_public_blog boolean,
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
    p.is_public_blog,
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
    p.is_public_blog,
    p.visibility,
    p.order_index
  ORDER BY p.order_index ASC;
$$;

REVOKE ALL ON FUNCTION public.get_content_program_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_content_program_catalog() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_public_blog_articles(p_program_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  program_id uuid,
  title text,
  description text,
  content_type text,
  article_url text,
  thumbnail_url text,
  session_title text,
  session_order integer,
  article_order integer,
  published_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    p.id AS program_id,
    c.title,
    c.description,
    c.content_type,
    c.url AS article_url,
    c.thumbnail_url,
    s.title AS session_title,
    s.order_index AS session_order,
    c.order_index AS article_order,
    c.created_at AS published_at
  FROM public.content_programs p
  JOIN public.content_sessions s
    ON s.program_id = p.id
   AND s.visibility = 'visible'
  JOIN public.member_area_content c
    ON c.session_id = s.id
   AND c.is_published = true
   AND c.visibility = 'visible'
   AND c.tier_required = 'LIVRE'
   AND c.turma_exclusiva IS NULL
   AND (c.disponivel_em IS NULL OR c.disponivel_em <= CURRENT_DATE)
  WHERE p.is_public_blog = true
    AND p.is_published = true
    AND p.visibility = 'visible'
    AND p.tier_required = 'LIVRE'
    AND p.turma_exclusiva IS NULL
    AND (p_program_id IS NULL OR p.id = p_program_id)
    AND NULLIF(btrim(c.url), '') IS NOT NULL
  ORDER BY s.order_index ASC, c.order_index ASC, c.created_at ASC;
$$;

REVOKE ALL ON FUNCTION public.get_public_blog_articles(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_blog_articles(uuid) TO anon, authenticated, service_role;

COMMIT;
