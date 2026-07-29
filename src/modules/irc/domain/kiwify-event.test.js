import { describe, expect, it } from 'vitest';
import { parseKiwifyIrcEvent } from './kiwify-event';

describe('eventos Kiwify do Diagnóstico Completo', () => {
  it('normaliza uma compra aprovada e dados aninhados', () => {
    expect(
      parseKiwifyIrcEvent({
        id: 'evt-1',
        webhook_event_type: 'purchase_approved',
        data: {
          transaction_id: 'purchase-1',
          product: { id: 'product-irc' },
          customer: { email: ' PESSOA@EXAMPLE.COM ', name: 'Pessoa Teste', phone: '5511999999999' }
        }
      })
    ).toMatchObject({
      eventId: 'evt-1:purchase_approved',
      accessStatus: 'active',
      purchaseId: 'purchase-1',
      productId: 'product-irc',
      email: 'pessoa@example.com'
    });
  });

  it.each([
    ['refunded', 'refunded'],
    ['chargeback', 'chargeback'],
    ['cancelled', 'revoked']
  ])('mapeia %s para %s sem apagar o histórico', (eventType, expectedStatus) => {
    const event = parseKiwifyIrcEvent({
      id: 'sale-1',
      event: eventType,
      transaction_id: 'purchase-1',
      product_id: 'product-irc'
    });
    expect(event.accessStatus).toBe(expectedStatus);
    expect(event.eventId).toBe(`sale-1:${eventType}`);
  });

  it('cria IDs distintos para aprovação e reembolso da mesma compra', () => {
    const base = { id: 'sale-1', transaction_id: 'purchase-1', product_id: 'product-irc' };
    const approved = parseKiwifyIrcEvent({ ...base, event: 'purchase_approved' });
    const refunded = parseKiwifyIrcEvent({ ...base, event: 'refunded' });
    expect(approved.eventId).not.toBe(refunded.eventId);
  });
});
