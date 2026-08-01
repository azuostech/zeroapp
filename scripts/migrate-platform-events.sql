-- Central de Atividade: eventos persistentes de operação, suporte e falhas.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.platform_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'user', 'auth', 'commerce', 'diagnostic', 'email', 'admin', 'system'
  )),
  severity text NOT NULL DEFAULT 'info' CHECK (severity IN (
    'info', 'success', 'warning', 'error'
  )),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source text NOT NULL,
  title text NOT NULL,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_events_occurred
  ON public.platform_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_events_attention
  ON public.platform_events (status, severity, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_events_user
  ON public.platform_events (user_id, occurred_at DESC)
  WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_platform_events_type
  ON public.platform_events (event_type, occurred_at DESC);

COMMENT ON TABLE public.platform_events IS
  'Eventos operacionais do ZeroApp. Retencao recomendada: 180 dias; falhas criticas podem ser exportadas antes da limpeza.';

ALTER TABLE public.platform_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_events_admin_select ON public.platform_events;
CREATE POLICY platform_events_admin_select ON public.platform_events
  FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS platform_events_admin_update ON public.platform_events;
CREATE POLICY platform_events_admin_update ON public.platform_events
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

REVOKE ALL ON public.platform_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, UPDATE ON public.platform_events TO authenticated;
GRANT ALL ON public.platform_events TO service_role;

COMMIT;
