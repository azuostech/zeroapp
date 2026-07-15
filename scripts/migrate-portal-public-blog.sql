-- ============================================================================
-- PORTAL PUBLICO - ARTIGOS DO BLOG FINANCAS DO ZERO
-- Expoe somente aulas publicadas do programa publico de blog, sem abrir o
-- catalogo de aulas dos demais programas.
-- ============================================================================

BEGIN;

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
  WHERE lower(btrim(p.title)) = lower('BLOG: FINANÇAS DO ZERO')
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
