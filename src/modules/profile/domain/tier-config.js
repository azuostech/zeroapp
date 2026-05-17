export const USER_TIERS = ['DESPERTAR', 'MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO'];

export const TIER_CONFIG = {
  DESPERTAR: {
    tier: 'DESPERTAR',
    name: 'Despertar',
    icon: '🌅',
    gradient: 'linear-gradient(135deg, #888888, #666666)',
    features: [
      'Acesso aos 6 blocos financeiros',
      'Sistema de ZeroCoins',
      'Dashboard financeiro',
      'Progresso de fases de gamificacao'
    ],
    coins_monthly: 0,
    next_tier: 'MOVIMENTO'
  },
  MOVIMENTO: {
    tier: 'MOVIMENTO',
    name: 'Movimento',
    icon: '⚡',
    gradient: 'linear-gradient(135deg, #FFD700, #FFA500)',
    features: [
      'Tudo do tier Despertar',
      'Acesso ao conteudo do Workshop',
      'Sistema de conquistas',
      'Bonus de +500 coins no resgate',
      'Suporte via comunidade'
    ],
    coins_monthly: 0,
    next_tier: 'ACELERACAO'
  },
  ACELERACAO: {
    tier: 'ACELERACAO',
    name: 'Aceleracao',
    icon: '🚀',
    gradient: 'linear-gradient(135deg, #00C853, #5DCAA5)',
    features: [
      'Tudo do tier Movimento',
      'Acesso ao leaderboard',
      'Mentoria em grupo',
      '+300 ZeroCoins por mes',
      'Relatorios financeiros avancados',
      'Suporte prioritario'
    ],
    coins_monthly: 300,
    next_tier: 'AUTOGOVERNO'
  },
  AUTOGOVERNO: {
    tier: 'AUTOGOVERNO',
    name: 'Autogoverno',
    icon: '👑',
    gradient: 'linear-gradient(135deg, #5DCAA5, #AFA9EC)',
    features: [
      'Tudo do tier Aceleracao',
      'Mentoria individual com Jackson',
      '+600 ZeroCoins por mes',
      'Analise personalizada de patrimonio',
      'Planejamento de legado',
      'Suporte VIP direto'
    ],
    coins_monthly: 600,
    next_tier: null
  }
};

export function normalizeTier(rawTier) {
  const tier = String(rawTier || '').toUpperCase();
  return USER_TIERS.includes(tier) ? tier : 'DESPERTAR';
}

export function getTierInfo(rawTier) {
  const tier = normalizeTier(rawTier);
  return TIER_CONFIG[tier];
}

