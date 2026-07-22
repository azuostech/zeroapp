-- Evita duplicidade quando duas sincronizacoes com o Resend rodam ao mesmo tempo.
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_logs_resend_id_unique
  ON public.email_logs(resend_id)
  WHERE resend_id IS NOT NULL;
