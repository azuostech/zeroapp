-- ============================================================================
-- SHAMAR - Correcao de recursao em RLS
-- Projeto: ZeroApp
-- Objetivo: remover ciclos entre policies de shamar_seasons, shamar_tribo_configs,
-- shamar_invites e shamar_board_squares.
-- Observacao: script idempotente para executar no Supabase SQL Editor.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.shamar_is_config_creator(p_config_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shamar_tribo_configs c
    WHERE c.id = p_config_id
      AND c.created_by = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.shamar_is_config_participant(p_config_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shamar_seasons s
    WHERE s.tribo_config_id = p_config_id
      AND s.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.shamar_has_pending_invite(p_config_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shamar_invites i
    WHERE i.tribo_config_id = p_config_id
      AND i.status = 'pending'
      AND (
        i.invited_user_id = auth.uid()
        OR lower(i.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.shamar_can_join_self_service_config(p_config_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.shamar_tribo_configs c
    WHERE c.id = p_config_id
      AND c.is_active = true
      AND (
        c.created_by = auth.uid()
        OR public.shamar_has_pending_invite(c.id)
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.shamar_is_config_creator(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shamar_is_config_participant(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shamar_has_pending_invite(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shamar_can_join_self_service_config(uuid) TO authenticated;

DROP POLICY IF EXISTS shamar_config_self_service_select ON public.shamar_tribo_configs;
CREATE POLICY shamar_config_self_service_select
  ON public.shamar_tribo_configs
  FOR SELECT
  TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR public.shamar_is_config_participant(id)
    OR public.shamar_has_pending_invite(id)
  );

DROP POLICY IF EXISTS shamar_board_self_service_select ON public.shamar_board_squares;
CREATE POLICY shamar_board_self_service_select
  ON public.shamar_board_squares
  FOR SELECT
  TO authenticated
  USING (
    public.shamar_is_config_creator(tribo_config_id)
    OR public.shamar_is_config_participant(tribo_config_id)
  );

DROP POLICY IF EXISTS shamar_board_self_service_insert ON public.shamar_board_squares;
CREATE POLICY shamar_board_self_service_insert
  ON public.shamar_board_squares
  FOR INSERT
  TO authenticated
  WITH CHECK (public.shamar_is_config_creator(tribo_config_id));

DROP POLICY IF EXISTS shamar_seasons_self_service_insert ON public.shamar_seasons;
CREATE POLICY shamar_seasons_self_service_insert
  ON public.shamar_seasons
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND public.shamar_can_join_self_service_config(tribo_config_id)
  );

DROP POLICY IF EXISTS shamar_seasons_tribo_creator_select ON public.shamar_seasons;
CREATE POLICY shamar_seasons_tribo_creator_select
  ON public.shamar_seasons
  FOR SELECT
  TO authenticated
  USING (public.shamar_is_config_creator(tribo_config_id));

DROP POLICY IF EXISTS shamar_seasons_tribo_creator_update ON public.shamar_seasons;
CREATE POLICY shamar_seasons_tribo_creator_update
  ON public.shamar_seasons
  FOR UPDATE
  TO authenticated
  USING (public.shamar_is_config_creator(tribo_config_id))
  WITH CHECK (public.shamar_is_config_creator(tribo_config_id));

DROP POLICY IF EXISTS shamar_invites_creator_insert ON public.shamar_invites;
CREATE POLICY shamar_invites_creator_insert
  ON public.shamar_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (
    inviter_user_id = (SELECT auth.uid())
    AND public.shamar_is_config_creator(tribo_config_id)
  );

DROP POLICY IF EXISTS shamar_invites_creator_select ON public.shamar_invites;
CREATE POLICY shamar_invites_creator_select
  ON public.shamar_invites
  FOR SELECT
  TO authenticated
  USING (
    inviter_user_id = (SELECT auth.uid())
    OR public.shamar_is_config_creator(tribo_config_id)
  );

DROP POLICY IF EXISTS shamar_invites_creator_update ON public.shamar_invites;
CREATE POLICY shamar_invites_creator_update
  ON public.shamar_invites
  FOR UPDATE
  TO authenticated
  USING (
    inviter_user_id = (SELECT auth.uid())
    OR public.shamar_is_config_creator(tribo_config_id)
  )
  WITH CHECK (
    inviter_user_id = (SELECT auth.uid())
    OR public.shamar_is_config_creator(tribo_config_id)
  );

COMMIT;
