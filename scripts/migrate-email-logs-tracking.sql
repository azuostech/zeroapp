-- ============================================================================
-- EMAIL LOGS TRACKING
-- Projeto: ZeroApp
-- Objetivo: expandir email_logs para rastreamento Resend, snapshots e painel admin.
-- Observacao: script idempotente
-- ============================================================================

BEGIN;

ALTER TABLE public.email_logs
  ADD COLUMN IF NOT EXISTS created_at     timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS opened_at      timestamptz,
  ADD COLUMN IF NOT EXISTS clicked_at     timestamptz,
  ADD COLUMN IF NOT EXISTS open_count     int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_count    int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_event_at  timestamptz,
  ADD COLUMN IF NOT EXISTS email_snapshot jsonb;

UPDATE public.email_logs
SET created_at = sent_at
WHERE sent_at IS NOT NULL
  AND created_at IS DISTINCT FROM sent_at;

CREATE INDEX IF NOT EXISTS idx_email_logs_user_created
  ON public.email_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_logs_type
  ON public.email_logs(email_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_logs_status_created
  ON public.email_logs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_logs_resend_id
  ON public.email_logs(resend_id)
  WHERE resend_id IS NOT NULL;

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'email_logs'
      AND policyname = 'email_logs_admin'
  ) THEN
    CREATE POLICY email_logs_admin ON public.email_logs
      FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

DO $$
DECLARE
  v_tracking_columns integer;
BEGIN
  SELECT COUNT(*)
  INTO v_tracking_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'email_logs'
    AND column_name IN (
      'created_at',
      'opened_at',
      'clicked_at',
      'open_count',
      'click_count',
      'last_event_at',
      'email_snapshot'
    );

  RAISE NOTICE 'Email logs tracking: %/7 colunas encontradas.', v_tracking_columns;
END $$;

COMMIT;
