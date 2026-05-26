import { getServiceSupabase } from '@/src/lib/supabase/service';
import { EMAIL_FROM, getResendClient, isResendConfigured } from '@/src/lib/email/resend-client';

async function writeEmailLog({ userId, to, subject, emailType, status, resendId = null }) {
  try {
    const supabase = getServiceSupabase();
    const { error } = await supabase.from('email_logs').insert({
      user_id: userId || null,
      email_type: emailType,
      recipient: to,
      subject,
      resend_id: resendId,
      status
    });

    if (error) {
      console.error('[email-service] erro ao gravar email_logs:', error.message || error);
    }
  } catch (error) {
    console.error('[email-service] falha ao inicializar cliente de log:', error?.message || error);
  }
}

/**
 * Envia email e registra no email_logs.
 */
export async function sendEmail({ userId, to, subject, html, emailType }) {
  if (!to || !subject || !html || !emailType) {
    return { success: false, error: 'invalid_email_payload' };
  }

  if (!isResendConfigured) {
    await writeEmailLog({
      userId,
      to,
      subject,
      emailType,
      status: 'failed'
    });

    return { success: false, error: 'resend_not_configured' };
  }

  try {
    const resend = getResendClient();
    if (!resend) {
      throw new Error('resend_not_configured');
    }

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: [to],
      subject,
      html
    });

    if (error) {
      throw new Error(error.message || 'resend_send_failed');
    }

    await writeEmailLog({
      userId,
      to,
      subject,
      emailType,
      status: 'sent',
      resendId: data?.id || null
    });

    return { success: true, id: data?.id || null };
  } catch (error) {
    console.error(`[email-service] erro ao enviar ${emailType} para ${to}:`, error);

    await writeEmailLog({
      userId,
      to,
      subject,
      emailType,
      status: 'failed'
    });

    return { success: false, error: error?.message || 'email_send_failed' };
  }
}
