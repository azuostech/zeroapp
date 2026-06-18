-- ============================================================================
-- SHAMAR - RLS para criacao self-service
-- Projeto: ZeroApp
-- Objetivo: permitir criacao de SHAMAR Individual, Dupla e Tribo quando a API
-- usa o usuario autenticado em vez de uma service role valida.
-- Observacao: script idempotente para executar no Supabase SQL Editor.
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS shamar_config_self_service_insert ON public.shamar_tribo_configs;
CREATE POLICY shamar_config_self_service_insert
  ON public.shamar_tribo_configs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND is_active = true
  );

DROP POLICY IF EXISTS shamar_config_self_service_select ON public.shamar_tribo_configs;
CREATE POLICY shamar_config_self_service_select
  ON public.shamar_tribo_configs
  FOR SELECT
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.shamar_seasons s
      WHERE s.tribo_config_id = shamar_tribo_configs.id
        AND s.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.shamar_invites i
      WHERE i.tribo_config_id = shamar_tribo_configs.id
        AND i.status = 'pending'
        AND (
          i.invited_user_id = (SELECT auth.uid())
          OR lower(i.invited_email) = lower(coalesce((SELECT auth.jwt() ->> 'email'), ''))
        )
    )
  );

DROP POLICY IF EXISTS shamar_board_self_service_select ON public.shamar_board_squares;
CREATE POLICY shamar_board_self_service_select
  ON public.shamar_board_squares
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.shamar_tribo_configs c
      WHERE c.id = shamar_board_squares.tribo_config_id
        AND c.created_by = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.shamar_seasons s
      WHERE s.tribo_config_id = shamar_board_squares.tribo_config_id
        AND s.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS shamar_board_self_service_insert ON public.shamar_board_squares;
CREATE POLICY shamar_board_self_service_insert
  ON public.shamar_board_squares
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.shamar_tribo_configs c
      WHERE c.id = shamar_board_squares.tribo_config_id
        AND c.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS shamar_seasons_self_service_insert ON public.shamar_seasons;
CREATE POLICY shamar_seasons_self_service_insert
  ON public.shamar_seasons
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.shamar_tribo_configs c
      WHERE c.id = shamar_seasons.tribo_config_id
        AND c.is_active = true
        AND (
          c.created_by = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.shamar_invites i
            WHERE i.tribo_config_id = c.id
              AND i.status = 'pending'
              AND (
                i.invited_user_id = (SELECT auth.uid())
                OR lower(i.invited_email) = lower(coalesce((SELECT auth.jwt() ->> 'email'), ''))
              )
          )
        )
    )
  );

DROP POLICY IF EXISTS shamar_idx_self_insert ON public.shamar_index_history;
CREATE POLICY shamar_idx_self_insert
  ON public.shamar_index_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.shamar_seasons s
      WHERE s.id = shamar_index_history.season_id
        AND s.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS shamar_idx_self_update ON public.shamar_index_history;
CREATE POLICY shamar_idx_self_update
  ON public.shamar_index_history
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.shamar_seasons s
      WHERE s.id = shamar_index_history.season_id
        AND s.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1
      FROM public.shamar_seasons s
      WHERE s.id = shamar_index_history.season_id
        AND s.user_id = (SELECT auth.uid())
    )
  );

COMMIT;
