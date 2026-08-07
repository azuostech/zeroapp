const APPROVED = new Set(['paid', 'approved', 'completed', 'confirmed', 'payment_approved', 'order_approved', 'purchase_approved']);
const REFUNDED = new Set(['refund', 'refunded']);
const CHARGEBACK = new Set(['chargeback']);
const REVOKED = new Set(['cancel', 'canceled', 'cancelled', 'rejected', 'refused']);

function normalize(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function findByKeys(value, keys, validator = Boolean, depth = 0) {
  if (!value || depth > 7) return '';
  if (Array.isArray(value)) {
    for (const nested of value) {
      const found = findByKeys(nested, keys, validator, depth + 1);
      if (found) return found;
    }
    return '';
  }
  if (typeof value !== 'object') return '';

  for (const [key, nested] of Object.entries(value)) {
    const normalizedKey = normalize(key).replace(/[^a-z0-9_]/g, '');
    if (keys.has(normalizedKey) && validator(nested)) return String(nested).trim();
  }
  for (const nested of Object.values(value)) {
    const found = findByKeys(nested, keys, validator, depth + 1);
    if (found) return found;
  }
  return '';
}

export function parseKiwifyIrcEvent(payload) {
  const eventType = String(
    payload?.webhook_event_type ||
      payload?.event ||
      payload?.type ||
      payload?.data?.webhook_event_type ||
      payload?.data?.event ||
      payload?.status ||
      payload?.order_status ||
      payload?.payment_status ||
      payload?.order?.webhook_event_type ||
      payload?.order?.order_status ||
      payload?.order?.payment_status ||
      ''
  ).trim();
  const marker = normalize(eventType);
  let accessStatus = null;
  if ([...APPROVED].some((candidate) => marker.includes(candidate))) accessStatus = 'active';
  if ([...REFUNDED].some((candidate) => marker.includes(candidate))) accessStatus = 'refunded';
  if ([...CHARGEBACK].some((candidate) => marker.includes(candidate))) accessStatus = 'chargeback';
  if ([...REVOKED].some((candidate) => marker.includes(candidate))) accessStatus = 'revoked';

  const purchaseId = String(
    payload?.transaction_id ||
      payload?.order_id ||
      payload?.sale_id ||
      payload?.data?.transaction_id ||
      payload?.data?.order_id ||
      payload?.order?.order_id ||
      findByKeys(payload, new Set(['transaction_id', 'order_id', 'sale_id', 'purchase_id']), Boolean)
  ).trim();
  const productId = String(
    payload?.product_id ||
      payload?.product?.id ||
      payload?.Product?.id ||
      payload?.data?.product_id ||
      payload?.data?.product?.id ||
      payload?.order?.Product?.product_id ||
      payload?.order?.product?.product_id ||
      findByKeys(payload, new Set(['product_id']), Boolean)
  ).trim();
  const email = normalize(
    payload?.customer?.email ||
      payload?.buyer?.email ||
      payload?.data?.customer?.email ||
      payload?.order?.Customer?.email ||
      payload?.order?.customer?.email ||
      findByKeys(payload, new Set(['customer_email', 'buyer_email', 'email']), (candidate) => String(candidate).includes('@'))
  );
  const name = String(
    payload?.customer?.name ||
      payload?.buyer?.name ||
      payload?.data?.customer?.name ||
      payload?.order?.Customer?.full_name ||
      payload?.order?.customer?.full_name ||
      findByKeys(payload, new Set(['customer_name', 'buyer_name', 'full_name', 'name']), (candidate) => String(candidate).trim().length > 1)
  ).trim();
  const phone = String(
    payload?.customer?.mobile ||
      payload?.customer?.phone ||
      payload?.buyer?.phone ||
      payload?.data?.customer?.phone ||
      payload?.order?.Customer?.mobile ||
      payload?.order?.customer?.mobile ||
      findByKeys(payload, new Set(['mobile', 'phone', 'whatsapp']), Boolean)
  ).trim();
  const rawEventId = String(
    payload?.webhook_id ||
      payload?.event_id ||
      payload?.id ||
      payload?.data?.webhook_id ||
      payload?.data?.event_id ||
      ''
  ).trim();
  const eventId = `${rawEventId || purchaseId}:${marker || 'unknown'}`;
  const checkoutLink = String(
    payload?.checkout_link ||
      payload?.order?.checkout_link ||
      findByKeys(payload, new Set(['checkout_link']), Boolean)
  ).trim();

  return { eventId, eventType: eventType || 'unknown', accessStatus, purchaseId, productId, checkoutLink, email, name, phone };
}
