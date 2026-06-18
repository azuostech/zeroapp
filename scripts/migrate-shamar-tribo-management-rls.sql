-- ============================================================================
-- SHAMAR - Gestao da Tribo pelo criador
-- Projeto: ZeroApp
-- Objetivo: permitir que o criador da TRIBO edite, convide e remova participantes.
-- Observacao: script idempotente para executar no Supabase SQL Editor.
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS shamar_config_creator_select ON public.shamar_tribo_configs;
CREATE POLICY shamar_config_creator_select
  ON public.shamar_tribo_configs
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = created_by);

DROP POLICY IF EXISTS shamar_config_creator_update ON public.shamar_tribo_configs;
CREATE POLICY shamar_config_creator_update
  ON public.shamar_tribo_configs
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = created_by)
  WITH CHECK ((SELECT auth.uid()) = created_by);

DROP POLICY IF EXISTS shamar_invites_creator_insert ON public.shamar_invites;
CREATE POLICY shamar_invites_creator_insert
  ON public.shamar_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    inviter_user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.shamar_tribo_configs c
      WHERE c.id = shamar_invites.tribo_config_id
        AND c.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS shamar_invites_creator_select ON public.shamar_invites;
CREATE POLICY shamar_invites_creator_select
  ON public.shamar_invites
  FOR SELECT
  TO authenticated
  USING (
    inviter_user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.shamar_tribo_configs c
      WHERE c.id = shamar_invites.tribo_config_id
        AND c.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS shamar_invites_creator_update ON public.shamar_invites;
CREATE POLICY shamar_invites_creator_update
  ON public.shamar_invites
  FOR UPDATE
  TO authenticated
  USING (
    inviter_user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.shamar_tribo_configs c
      WHERE c.id = shamar_invites.tribo_config_id
        AND c.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    inviter_user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.shamar_tribo_configs c
      WHERE c.id = shamar_invites.tribo_config_id
        AND c.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS shamar_seasons_tribo_creator_select ON public.shamar_seasons;
CREATE POLICY shamar_seasons_tribo_creator_select
  ON public.shamar_seasons
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.shamar_tribo_configs c
      WHERE c.id = shamar_seasons.tribo_config_id
        AND c.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS shamar_seasons_tribo_creator_update ON public.shamar_seasons;
CREATE POLICY shamar_seasons_tribo_creator_update
  ON public.shamar_seasons
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.shamar_tribo_configs c
      WHERE c.id = shamar_seasons.tribo_config_id
        AND c.created_by = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.shamar_tribo_configs c
      WHERE c.id = shamar_seasons.tribo_config_id
        AND c.created_by = (SELECT auth.uid())
    )
  );

COMMIT;
