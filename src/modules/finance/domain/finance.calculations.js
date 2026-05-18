function parseCurrency(value) {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;

  const normalized = value
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');

  if (!normalized) return 0;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const totalPrevisto = (itens = []) =>
  itens.reduce((acc, item) => acc + parseCurrency(item?.valor_previsto ?? item?.valor ?? '0'), 0);

export const totalRealizado = (itens = []) =>
  itens
    .filter((item) => Boolean(item?.realized))
    .reduce((acc, item) => acc + parseCurrency(item?.valor_realizado ?? '0'), 0);

export const percentualRealizado = (itens = []) => {
  const previsto = totalPrevisto(itens);
  if (previsto === 0) return 0;
  return Math.round((totalRealizado(itens) / previsto) * 100);
};

/**
 * @returns {'completo'|'pendente'|'acima'|'vazio'}
 */
export const statusBloco = (itens = []) => {
  if (!Array.isArray(itens) || itens.length === 0) return 'vazio';

  const pct = percentualRealizado(itens);
  if (pct === 0) return 'pendente';
  if (pct > 100) return 'acima';
  if (itens.every((item) => Boolean(item?.realized))) return 'completo';

  return 'pendente';
};

export const totalPrevistoContas = (grupos = []) =>
  grupos.reduce((acc, grupo) => acc + totalPrevisto(Array.isArray(grupo?.subcats) ? grupo.subcats : []), 0);

export const totalRealizadoContas = (grupos = []) =>
  grupos.reduce((acc, grupo) => acc + totalRealizado(Array.isArray(grupo?.subcats) ? grupo.subcats : []), 0);
