export const FASES = [
  {
    id: 'bombeiro',
    emoji: '🔥',
    nome: 'Bombeiro',
    phase: 'BOMBEIRO',
    min: 0,
    max: 200,
    descricao: 'Cadastro + primeiros lançamentos',
    recompensas: ['Acesso básico ao método', 'Aulas introdutórias']
  },
  {
    id: 'sobrevivente',
    emoji: '🌱',
    nome: 'Sobrevivente',
    phase: 'SOBREVIVENTE',
    min: 201,
    max: 800,
    descricao: 'Consistência nos primeiros meses',
    recompensas: ['Aulas Blocos 1-3', 'Acesso à comunidade']
  },
  {
    id: 'construtor',
    emoji: '🏗️',
    nome: 'Construtor',
    phase: 'CONSTRUTOR',
    min: 801,
    max: 2000,
    descricao: 'Hábito financeiro consolidado',
    recompensas: ['Placa digital exclusiva', 'Aulas Blocos 4-6']
  },
  {
    id: 'multiplicador',
    emoji: '💎',
    nome: 'Multiplicador',
    phase: 'MULTIPLICADOR',
    min: 2001,
    max: Infinity,
    descricao: 'Domínio total do método',
    recompensas: ['Brinde físico enviado', 'Leaderboard', 'Badge exclusivo']
  }
];

export function getFaseAtual(coinsTotal) {
  const total = Number(coinsTotal || 0);
  return [...FASES].reverse().find((fase) => total >= fase.min) || FASES[0];
}

export function getProximaFase(coinsTotal) {
  const total = Number(coinsTotal || 0);
  return FASES.find((fase) => total < fase.min) || null;
}

export function getProgressInfo(coinsTotal) {
  const total = Number(coinsTotal || 0);
  const faseAtual = getFaseAtual(total);
  const proximaFase = getProximaFase(total);

  if (!proximaFase || faseAtual.max === Infinity) {
    return {
      faseAtual,
      proximaFase: null,
      progressoPct: 100,
      coinsParaProxima: 0
    };
  }

  const range = faseAtual.max - faseAtual.min;
  const atual = Math.max(0, total - faseAtual.min);
  const progressoPct = range > 0 ? Math.min(100, Math.round((atual / range) * 100)) : 100;

  return {
    faseAtual,
    proximaFase,
    progressoPct,
    coinsParaProxima: Math.max(0, proximaFase.min - total)
  };
}
