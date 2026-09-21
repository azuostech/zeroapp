-- Relatórios infográficos personalizados do Diagnóstico Completo.
-- Mantém o relatório textual como fonte auditável e adiciona os artefatos visuais.
BEGIN;

ALTER TABLE public.irc_diagnostics
  ADD COLUMN IF NOT EXISTS visual_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS visual_version text,
  ADD COLUMN IF NOT EXISTS visual_model text,
  ADD COLUMN IF NOT EXISTS visual_assets jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS visuals_generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS visual_last_error text;

ALTER TABLE public.irc_diagnostics
  DROP CONSTRAINT IF EXISTS irc_diagnostics_visual_status_check;

ALTER TABLE public.irc_diagnostics
  ADD CONSTRAINT irc_diagnostics_visual_status_check
  CHECK (visual_status IN ('pending', 'generating', 'ready', 'fallback', 'failed'));

CREATE INDEX IF NOT EXISTS idx_irc_diagnostics_visual_delivery
  ON public.irc_diagnostics (status, visual_status, pdf_status);

-- Força a recriação no novo layout quando o usuário voltar a abrir o relatório.
-- O e-mail antigo não é reenviado automaticamente.
UPDATE public.irc_diagnostics
SET
  visual_status = 'pending',
  visual_version = NULL,
  visual_model = NULL,
  visual_assets = '{}'::jsonb,
  visuals_generated_at = NULL,
  visual_last_error = NULL,
  pdf_path = NULL,
  pdf_generated_at = NULL,
  pdf_status = 'pending'
WHERE status = 'report_ready';

COMMIT;
