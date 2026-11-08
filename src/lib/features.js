// Feature flags do ZeroApp. Ligar/desligar via variável de ambiente na Vercel.
// SHAMAR: oculto por decisão de produto (nov/2026). Dados e código preservados.
export const SHAMAR_ENABLED = process.env.NEXT_PUBLIC_FEATURE_SHAMAR === 'true';
// Investimentos: liberação controlada após migration e QA do mentor.
export const INVESTMENTS_ENABLED = process.env.NEXT_PUBLIC_FEATURE_INVESTMENTS === 'true';
