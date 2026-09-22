export const IRC_DELIVERY_MAX_ATTEMPTS = 5;
export const IRC_DELIVERY_STALE_MINUTES = 15;

export function safeIrcDeliveryError(error) {
  const message = String(error?.message || '').toLowerCase();
  if (message.includes('.afm') || message.includes('font')) return 'pdf_assets_missing';
  if (message.includes('bucket') || message.includes('storage') || message.includes('upload')) return 'pdf_upload_failed';
  if (message.includes('email')) return 'report_email_failed';
  return 'delivery_failed';
}

export function nextIrcDeliveryAttempt(attempts, now = new Date()) {
  const delays = [1, 5, 15, 60, 240];
  const minutes = delays[Math.min(Math.max(Number(attempts || 1) - 1, 0), delays.length - 1)];
  return new Date(now.getTime() + minutes * 60_000).toISOString();
}
