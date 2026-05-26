import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
let resendClient = null;

if (!RESEND_API_KEY) {
  console.warn('[email/resend-client] RESEND_API_KEY nao configurada');
}

export const isResendConfigured = Boolean(RESEND_API_KEY);
export function getResendClient() {
  if (!isResendConfigured) return null;
  if (resendClient) return resendClient;
  resendClient = new Resend(RESEND_API_KEY);
  return resendClient;
}

const fromName = process.env.RESEND_FROM_NAME || 'ZeroApp';
const fromEmail = process.env.RESEND_FROM_EMAIL || 'zeroapp@zeroapp.tech';

export const EMAIL_FROM = `${fromName} <${fromEmail}>`;
