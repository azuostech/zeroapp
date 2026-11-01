// Feature flags do ZeroApp. Ligar/desligar via variável de ambiente na Vercel.
// SHAMAR: oculto por decisão de produto (nov/2026). Dados e código preservados.
export const SHAMAR_ENABLED = process.env.NEXT_PUBLIC_FEATURE_SHAMAR === 'true';
