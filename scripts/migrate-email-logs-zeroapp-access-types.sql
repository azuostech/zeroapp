-- Permite registrar separadamente os e-mails pós-compra do produto ZeroAPP.
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
    'zeroapp_access_invite',
    'zeroapp_access_granted',
    'irc_access_invite',
    'irc_access_granted',
    'irc_report_ready'
  ));
