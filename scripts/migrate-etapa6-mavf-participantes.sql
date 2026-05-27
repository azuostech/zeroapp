-- Etapa 6: MAVF com participantes por sessão
-- Objetivo: permitir que o admin defina exatamente quais usuários podem visualizar e responder cada sessão MAVF.

BEGIN;

CREATE TABLE IF NOT EXISTS public.mavf_session_participants (
  id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
  session_id uuid NOT NULL REFERENCES public.mavf_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by_admin_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT mavf_session_participants_pkey PRIMARY KEY (id),
  CONSTRAINT mavf_session_participants_session_user_key UNIQUE (session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_mavf_session_participants_session_id
  ON public.mavf_session_participants(session_id);

CREATE INDEX IF NOT EXISTS idx_mavf_session_participants_user_id
  ON public.mavf_session_participants(user_id);

-- Backfill: respostas antigas viram participantes da respectiva sessão.
INSERT INTO public.mavf_session_participants (session_id, user_id, added_by_admin_id)
SELECT DISTINCT r.session_id, r.user_id, s.created_by_admin_id
FROM public.mavf_responses r
JOIN public.mavf_sessions s ON s.id = r.session_id
WHERE r.session_id IS NOT NULL
  AND r.user_id IS NOT NULL
ON CONFLICT (session_id, user_id) DO NOTHING;

ALTER TABLE public.mavf_session_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage session participants" ON public.mavf_session_participants;
CREATE POLICY "Admins can manage session participants"
  ON public.mavf_session_participants
  TO authenticated
  USING (
    public.current_user_is_admin()
  )
  WITH CHECK (
    public.current_user_is_admin()
  );

DROP POLICY IF EXISTS "Users can view own session participants" ON public.mavf_session_participants;
CREATE POLICY "Users can view own session participants"
  ON public.mavf_session_participants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

COMMIT;

DO $$
DECLARE
  v_policy_count integer;
BEGIN
  SELECT COUNT(*)
  INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'mavf_session_participants';

  RAISE NOTICE 'Etapa 6 SQL: % policies em mavf_session_participants (esperado: 2).', v_policy_count;
END $$;
