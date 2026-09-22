import { describe, expect, it } from 'vitest';
import {
  nextIrcDeliveryAttempt,
  safeIrcDeliveryError
} from './irc-delivery-policy';

describe('irc delivery automation', () => {
  it('applies progressive retry delays capped at four hours', () => {
    const now = new Date('2026-09-22T12:00:00.000Z');
    expect(nextIrcDeliveryAttempt(1, now)).toBe('2026-09-22T12:01:00.000Z');
    expect(nextIrcDeliveryAttempt(2, now)).toBe('2026-09-22T12:05:00.000Z');
    expect(nextIrcDeliveryAttempt(3, now)).toBe('2026-09-22T12:15:00.000Z');
    expect(nextIrcDeliveryAttempt(4, now)).toBe('2026-09-22T13:00:00.000Z');
    expect(nextIrcDeliveryAttempt(99, now)).toBe('2026-09-22T16:00:00.000Z');
  });

  it('maps internal failures to safe operational codes', () => {
    expect(safeIrcDeliveryError(new Error('font .afm missing'))).toBe('pdf_assets_missing');
    expect(safeIrcDeliveryError(new Error('Storage upload failed'))).toBe('pdf_upload_failed');
    expect(safeIrcDeliveryError(new Error('email provider unavailable'))).toBe('report_email_failed');
    expect(safeIrcDeliveryError(new Error('unexpected'))).toBe('delivery_failed');
  });
});
