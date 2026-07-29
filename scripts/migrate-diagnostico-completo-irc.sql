-- Diagnostico Completo IRC
-- Entitlements, idempotencia de compra, tag ChatQuiz, persistencia e PDF privado.
BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.commerce_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  product_code text,
  purchase_id text,
  payload_hash text NOT NULL,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'processed', 'ignored', 'failed')),
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts > 0),
  last_error text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_commerce_webhook_purchase
  ON public.commerce_webhook_events (provider, purchase_id);

CREATE TABLE IF NOT EXISTS public.product_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_code text NOT NULL,
  purchase_id text NOT NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'revoked', 'refunded', 'chargeback', 'expired')),
  source text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, purchase_id, product_code)
);

CREATE INDEX IF NOT EXISTS idx_product_access_user_product_status
  ON public.product_access (user_id, product_code, status);

CREATE TABLE IF NOT EXISTS public.user_tags (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag text NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tag)
);

CREATE TABLE IF NOT EXISTS public.irc_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entitlement_id uuid NOT NULL REFERENCES public.product_access(id),
  status text NOT NULL DEFAULT 'not_started'
    CHECK (status IN (
      'not_started',
      'in_progress',
      'answers_completed',
      'generating_report',
      'report_ready',
      'generation_failed'
    )),
  current_domain integer NOT NULL DEFAULT 0 CHECK (current_domain BETWEEN 0 AND 6),
  current_stage text NOT NULL DEFAULT 'entry' CHECK (current_stage IN ('entry', 'branch', 'complete')),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  report text,
  report_model text,
  report_version text,
  report_generated_at timestamptz,
  report_input_tokens integer,
  report_output_tokens integer,
  pdf_path text,
  pdf_generated_at timestamptz,
  pdf_status text NOT NULL DEFAULT 'pending'
    CHECK (pdf_status IN ('pending', 'generating', 'ready', 'failed')),
  email_sent_at timestamptz,
  email_status text NOT NULL DEFAULT 'pending'
    CHECK (email_status IN ('pending', 'sending', 'sent', 'failed')),
  delivery_started_at timestamptz,
  generation_attempts integer NOT NULL DEFAULT 0,
  last_error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_irc_diagnostics_delivery
  ON public.irc_diagnostics (status, pdf_status, email_status);

ALTER TABLE public.email_logs
  DROP CONSTRAINT IF EXISTS email_logs_email_type_check;

ALTER TABLE public.email_logs
  ADD CONSTRAINT email_logs_email_type_check
  CHECK (email_type IN (
    'monthly_report',
    'phase_milestone',
    'reconnect',
    'test',
    'shamar_invite',
    'shamar_invite_resend',
    'shamar_invite_admin_resend',
    'shamar_contribution_registered',
    'welcome_lead',
    'workshop_access_granted',
    'irc_access_invite',
    'irc_access_granted',
    'irc_report_ready'
  ));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commerce_webhook_updated_at ON public.commerce_webhook_events;
CREATE TRIGGER trg_commerce_webhook_updated_at
  BEFORE UPDATE ON public.commerce_webhook_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_product_access_updated_at ON public.product_access;
CREATE TRIGGER trg_product_access_updated_at
  BEFORE UPDATE ON public.product_access
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_irc_diagnostics_updated_at ON public.irc_diagnostics;
CREATE TRIGGER trg_irc_diagnostics_updated_at
  BEFORE UPDATE ON public.irc_diagnostics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.commerce_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irc_diagnostics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_access_self_select ON public.product_access;
CREATE POLICY product_access_self_select ON public.product_access
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS irc_diagnostics_self_select ON public.irc_diagnostics;
CREATE POLICY irc_diagnostics_self_select ON public.irc_diagnostics
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS product_access_admin_all ON public.product_access;
CREATE POLICY product_access_admin_all ON public.product_access
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS user_tags_admin_all ON public.user_tags;
CREATE POLICY user_tags_admin_all ON public.user_tags
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS irc_diagnostics_admin_all ON public.irc_diagnostics;
CREATE POLICY irc_diagnostics_admin_all ON public.irc_diagnostics
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

REVOKE ALL ON public.commerce_webhook_events FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.product_access FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.user_tags FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.irc_diagnostics FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.product_access, public.irc_diagnostics TO authenticated;
GRANT ALL ON public.commerce_webhook_events, public.product_access, public.user_tags, public.irc_diagnostics TO service_role;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('irc-reports', 'irc-reports', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS irc_reports_admin_select ON storage.objects;
CREATE POLICY irc_reports_admin_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'irc-reports' AND public.is_admin());

COMMIT;
