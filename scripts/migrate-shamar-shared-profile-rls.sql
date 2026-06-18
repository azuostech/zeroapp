-- ============================================================================
-- SHAMAR - Perfis compartilhados por TRIBO
-- Projeto: ZeroApp
-- Objetivo: permitir que participantes/criador vejam nome e email basicos dos
-- participantes da mesma jornada SHAMAR, sem abrir leitura global de profiles.
-- Observacao: script idempotente para executar no Supabase SQL Editor.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.shamar_can_read_profile(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.shamar_seasons target
      JOIN public.shamar_tribo_configs c ON c.id = target.tribo_config_id
      LEFT JOIN public.shamar_seasons viewer
        ON viewer.tribo_config_id = target.tribo_config_id
       AND viewer.user_id = auth.uid()
      WHERE target.user_id = p_profile_id
        AND target.status = 'active'
        AND (
          c.created_by = auth.uid()
          OR viewer.id IS NOT NULL
        )
    );
$$;

GRANT EXECUTE ON FUNCTION public.shamar_can_read_profile(uuid) TO authenticated;

DROP POLICY IF EXISTS profiles_shamar_shared_select ON public.profiles;
CREATE POLICY profiles_shamar_shared_select
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (public.shamar_can_read_profile(id));

COMMIT;
