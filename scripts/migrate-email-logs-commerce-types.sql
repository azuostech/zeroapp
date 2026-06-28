-- ============================================================================
-- EMAIL LOGS - Tipos de leads e Acesso Basico
-- Projeto: ZeroApp
-- Objetivo: permitir logs dos emails de boas-vindas e liberacao Workshop.
-- Observacao: script idempotente para executar no Supabase SQL Editor.
-- ============================================================================

BEGIN;

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
    'workshop_access_granted'
  ));

COMMIT;
