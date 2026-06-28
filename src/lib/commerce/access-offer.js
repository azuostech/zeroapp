export const WORKSHOP_TURMA = 'Workshop';
export const WORKSHOP_TIER = 'DESPERTAR';
export const BASIC_ACCESS_PRICE_LABEL = 'R$ 29,90';
export const BASIC_ACCESS_CHECKOUT_URL =
  process.env.NEXT_PUBLIC_BASIC_ACCESS_CHECKOUT_URL || 'https://pay.kiwify.com.br/mioXCpq';
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '5511936215634';

function sanitizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

export function buildWhatsappUrl(message, whatsappNumber = WHATSAPP_NUMBER) {
  const sanitizedNumber = sanitizePhone(whatsappNumber);
  const encodedMessage = encodeURIComponent(String(message || 'Ola! Quero saber mais sobre o ZeroApp.'));
  const baseUrl = sanitizedNumber ? `https://wa.me/${sanitizedNumber}` : 'https://wa.me/';
  return `${baseUrl}?text=${encodedMessage}`;
}

export function buildMentorshipWhatsappUrl() {
  return buildWhatsappUrl(
    'Ola! Estou no ZeroApp e quero falar com um atendente sobre a mentoria e os proximos passos.'
  );
}

export function buildRestrictedAccessWhatsappUrl() {
  return buildWhatsappUrl(
    `Ola! Vi o acesso basico do ZeroApp por ${BASIC_ACCESS_PRICE_LABEL} e quero tirar uma duvida.`
  );
}
