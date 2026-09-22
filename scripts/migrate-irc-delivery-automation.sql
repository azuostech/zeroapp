-- Automação resiliente da entrega dos relatórios do Diagnóstico Completo.
BEGIN;

ALTER TABLE public.irc_diagnostics
  ADD COLUMN IF NOT EXISTS delivery_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_next_attempt_at timestamptz;

ALTER TABLE public.irc_diagnostics
  DROP CONSTRAINT IF EXISTS irc_diagnostics_delivery_attempts_check;

ALTER TABLE public.irc_diagnostics
  ADD CONSTRAINT irc_diagnostics_delivery_attempts_check
  CHECK (delivery_attempts >= 0);

CREATE INDEX IF NOT EXISTS idx_irc_diagnostics_automated_delivery
  ON public.irc_diagnostics (delivery_next_attempt_at, delivery_attempts, report_generated_at)
  WHERE status = 'report_ready'
    AND (pdf_status IN ('pending', 'failed') OR email_status IN ('pending', 'failed'));

COMMIT;
