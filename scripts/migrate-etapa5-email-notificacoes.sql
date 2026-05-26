-- ============================================================================
-- ETAPA 5 - EMAIL MENSAL + NOTIFICACOES
-- Projeto: ZeroApp
-- Objetivo: criar estruturas de assinatura de push e log de emails
-- Observacao: script idempotente
-- ============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------------------------
-- 0.1 push_subscriptions
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text        NOT NULL,
  p256dh      text        NOT NULL,
  auth        text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_user
  ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_self ON public.push_subscriptions;
DROP POLICY IF EXISTS push_admin ON public.push_subscriptions;

CREATE POLICY push_self ON public.push_subscriptions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY push_admin ON public.push_subscriptions
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------------
-- 0.2 email_logs
-- --------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_logs (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  email_type  text        NOT NULL CHECK (email_type IN (
    'monthly_report',
    'phase_milestone',
    'reconnect',
    'test'
  )),
  recipient   text        NOT NULL,
  subject     text        NOT NULL,
  resend_id   text,
  status      text        NOT NULL DEFAULT 'sent',
  sent_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_user
  ON public.email_logs(user_id, sent_at DESC);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_logs_admin ON public.email_logs;

CREATE POLICY email_logs_admin ON public.email_logs
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------------
-- 0.3 Verificacao final
-- --------------------------------------------------------------------------
DO $$
DECLARE
  v_tables_count integer;
BEGIN
  SELECT COUNT(*)
  INTO v_tables_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('push_subscriptions', 'email_logs');

  RAISE NOTICE 'Etapa 5 SQL: %/2 tabelas encontradas.', v_tables_count;
END $$;

COMMIT;
