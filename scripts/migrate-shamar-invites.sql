-- SHAMAR - Convites com aceite explicito

CREATE TABLE IF NOT EXISTS public.shamar_invites (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tribo_config_id uuid NOT NULL REFERENCES public.shamar_tribo_configs(id) ON DELETE CASCADE,
  inviter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  invited_email text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('dupla', 'tribo')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
  token text NOT NULL UNIQUE,
  email_sent_at timestamptz,
  email_error text,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shamar_invites_email_status
  ON public.shamar_invites (lower(invited_email), status);

CREATE INDEX IF NOT EXISTS idx_shamar_invites_config
  ON public.shamar_invites (tribo_config_id, status);

ALTER TABLE public.shamar_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shamar_invites_owner_read ON public.shamar_invites;
DROP POLICY IF EXISTS shamar_invites_invited_read ON public.shamar_invites;
DROP POLICY IF EXISTS shamar_invites_admin ON public.shamar_invites;

CREATE POLICY shamar_invites_owner_read
  ON public.shamar_invites
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = inviter_user_id);

CREATE POLICY shamar_invites_invited_read
  ON public.shamar_invites
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = invited_user_id
    OR lower(invited_email) = lower(coalesce((SELECT auth.jwt() ->> 'email'), ''))
  );

CREATE POLICY shamar_invites_admin
  ON public.shamar_invites
  FOR ALL
  TO authenticated
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));
