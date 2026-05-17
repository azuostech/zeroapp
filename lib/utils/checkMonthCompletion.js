const BLOCK_KEYS = {
  receitas: ['receitas'],
  pagarPrimeiro: ['pagar-primeiro', 'se_pagar_primeiro', 'pagar_primeiro'],
  doar: ['doar'],
  contas: ['contas', 'pagar_as_contas'],
  investimentos: ['investimentos'],
  desfrute: ['desfrute']
};

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;

  const normalized = value.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.').trim();
  if (!normalized) return 0;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasPositiveInSimpleArray(list) {
  if (!Array.isArray(list) || list.length === 0) return false;
  return list.some((item) => toNumber(item?.valor) > 0);
}

function hasPositiveInContas(block) {
  if (Array.isArray(block)) {
    return block.some((group) => Array.isArray(group?.subcats) && group.subcats.some((sub) => toNumber(sub?.valor) > 0));
  }

  if (block && typeof block === 'object') {
    return Object.values(block).some((group) => {
      if (!group || typeof group !== 'object') return false;
      const list = Array.isArray(group.subcats) ? group.subcats : Array.isArray(group.items) ? group.items : [];
      return list.some((item) => toNumber(item?.valor) > 0);
    });
  }

  return false;
}

function pickBlock(data, aliases) {
  if (!data || typeof data !== 'object') return undefined;
  for (const alias of aliases) {
    if (Object.prototype.hasOwnProperty.call(data, alias)) {
      return data[alias];
    }
  }
  return undefined;
}

export function checkMonthCompletionData(financialData) {
  if (!financialData || typeof financialData !== 'object' || Array.isArray(financialData)) {
    return false;
  }

  const receitas = pickBlock(financialData, BLOCK_KEYS.receitas);
  const pagarPrimeiro = pickBlock(financialData, BLOCK_KEYS.pagarPrimeiro);
  const doar = pickBlock(financialData, BLOCK_KEYS.doar);
  const contas = pickBlock(financialData, BLOCK_KEYS.contas);
  const investimentos = pickBlock(financialData, BLOCK_KEYS.investimentos);
  const desfrute = pickBlock(financialData, BLOCK_KEYS.desfrute);

  const blocks = [
    hasPositiveInSimpleArray(receitas),
    hasPositiveInSimpleArray(pagarPrimeiro),
    hasPositiveInSimpleArray(doar),
    hasPositiveInContas(contas),
    hasPositiveInSimpleArray(investimentos),
    hasPositiveInSimpleArray(desfrute)
  ];

  return blocks.every(Boolean);
}

export function getCurrentMonthMeta() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1
  };
}

