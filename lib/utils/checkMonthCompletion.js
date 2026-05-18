const BLOCK_KEYS = {
  receitas: ['receitas'],
  pagarPrimeiro: ['pagar-primeiro', 'se_pagar_primeiro', 'pagar_primeiro'],
  doar: ['doar'],
  contas: ['contas', 'pagar_as_contas'],
  investimentos: ['investimentos'],
  desfrute: ['desfrute']
};

function isRealized(item) {
  if (!item || typeof item !== 'object') return false;
  if (typeof item.realized === 'boolean') return item.realized;
  const normalized = String(item.realized || '').trim().toLowerCase();
  return ['true', 't', '1', 'yes', 'y', 'sim'].includes(normalized);
}

function allRealizedInSimpleArray(list) {
  if (!Array.isArray(list)) return true;
  return list.every((item) => isRealized(item));
}

function allRealizedInContas(block) {
  if (Array.isArray(block)) {
    return block.every((group) => {
      const subcats = Array.isArray(group?.subcats) ? group.subcats : [];
      return subcats.every((subcat) => isRealized(subcat));
    });
  }

  if (block && typeof block === 'object') {
    return Object.values(block).every((group) => {
      if (!group || typeof group !== 'object') return true;
      const list = Array.isArray(group.subcats) ? group.subcats : Array.isArray(group.items) ? group.items : [];
      return list.every((item) => isRealized(item));
    });
  }

  return true;
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

  const blocksByRealized = [
    allRealizedInSimpleArray(receitas),
    allRealizedInSimpleArray(pagarPrimeiro),
    allRealizedInSimpleArray(doar),
    allRealizedInContas(contas),
    allRealizedInSimpleArray(investimentos),
    allRealizedInSimpleArray(desfrute)
  ];

  return blocksByRealized.every(Boolean);
}

export function getCurrentMonthMeta() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1
  };
}
