import { describe, expect, it } from 'vitest';
import { buildPlatformActivity } from './platform-activity';

const profile = {
  id: 'user-1',
  full_name: 'Pessoa Teste',
  email: 'pessoa@example.com',
  tier: 'MOVIMENTO',
  status: 'active',
  role: 'user',
  created_at: '2026-08-01T10:00:00.000Z'
};

describe('buildPlatformActivity', () => {
  it('unifica cadastros, compras e falhas em uma linha do tempo', () => {
    const result = buildPlatformActivity({
      profiles: [profile],
      profileById: new Map([[profile.id, profile]]),
      productAccess: [{
        id: 'access-1',
        user_id: profile.id,
        product_code: 'diagnostico_completo',
        purchase_id: 'purchase-1',
        status: 'active',
        source: 'ChatQuiz',
        granted_at: '2026-08-01T10:05:00.000Z'
      }],
      diagnostics: [{
        id: 'diagnostic-1',
        user_id: profile.id,
        status: 'generation_failed',
        email_status: 'failed',
        pdf_status: 'failed',
        last_error: 'delivery_failed',
        updated_at: '2026-08-01T10:20:00.000Z'
      }],
      emailLogs: [{
        id: 'email-1',
        user_id: profile.id,
        email_type: 'irc_report_ready',
        recipient: profile.email,
        subject: 'Seu diagnóstico',
        status: 'failed',
        created_at: '2026-08-01T10:21:00.000Z'
      }],
      feedEvents: [{
        id: 'movement-1',
        user_id: profile.id,
        event_type: 'content_completed',
        title: 'Concluiu uma aula',
        created_at: '2026-08-01T10:22:00.000Z'
      }],
      webhookEvents: [],
      platformEvents: [],
      adminLogs: []
    });

    expect(result.events.map((item) => item.type)).toEqual(expect.arrayContaining([
      'user.signup',
      'commerce.active',
      'diagnostic.generation_failed',
      'email.failed',
      'movement.content_completed'
    ]));
    expect(result.metrics.critical_errors).toBeGreaterThanOrEqual(2);
  });

  it('sinaliza compra do diagnóstico que ainda não começou, mesmo sem diagnóstico criado', () => {
    const result = buildPlatformActivity({
      profiles: [profile],
      profileById: new Map([[profile.id, profile]]),
      productAccess: [{
        id: 'access-1',
        user_id: profile.id,
        product_code: 'diagnostico_completo',
        status: 'active',
        source: 'ChatQuiz',
        granted_at: '2026-08-01T10:05:00.000Z'
      }],
      diagnostics: [],
      emailLogs: [],
      feedEvents: [],
      webhookEvents: [],
      platformEvents: [],
      adminLogs: []
    });

    expect(result.attention.some((item) => item.type === 'diagnostic.onboarding_pending')).toBe(true);
  });
});
