import { normalizeFinancialData } from '../domain/defaults';

export const ANNUAL_MONTHS = Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0'));

export const ANNUAL_BLOCKS = [
  { key: 'receitas', label: 'Receitas', type: 'revenue' },
  { key: 'pagar-primeiro', label: 'Se Pagar Primeiro', type: 'expense' },
  { key: 'doar', label: 'Doação', type: 'expense' },
  { key: 'contas', label: 'Contas', type: 'expense' },
  { key: 'investimentos', label: 'Investimentos', type: 'expense' },
  { key: 'desfrute', label: 'Desfrute', type: 'expense' }
];

function parseMoney(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;

  const compact = value.trim().replace(/[^\d,.-]/g, '');
  if (!compact) return 0;

  const normalized = compact.includes(',')
    ? compact.replace(/\./g, '').replace(',', '.')
    : compact;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isRealized(item) {
  if (typeof item?.realized === 'boolean') return item.realized;
  return ['true', 't', '1', 'yes', 'y', 'sim'].includes(String(item?.realized || '').trim().toLowerCase());
}

function realizedValue(item) {
  if (!isRealized(item)) return 0;
  return parseMoney(item?.valor_realizado ?? '0');
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function percentage(value, revenue) {
  if (!revenue) return 0;
  return Math.round((Number(value) / Number(revenue)) * 1000) / 10;
}

function emptyMonthly() {
  return Object.fromEntries(ANNUAL_MONTHS.map((month) => [month, 0]));
}

function entryIdentity(groupName, itemName) {
  return `${String(groupName || '').trim().toLocaleLowerCase('pt-BR')}::${String(itemName || '').trim().toLocaleLowerCase('pt-BR')}`;
}

function addRealizedEntry(block, month, item, groupName = '') {
  if (!isRealized(item)) return;

  const itemName = String(item?.nome || 'Sem descrição').trim() || 'Sem descrição';
  const key = entryIdentity(groupName, itemName);
  const value = realizedValue(item);
  let entry = block.entryMap.get(key);

  if (!entry) {
    entry = {
      key,
      label: itemName,
      groupLabel: String(groupName || '').trim(),
      monthly: emptyMonthly()
    };
    block.entryMap.set(key, entry);
  }

  entry.monthly[month] = roundMoney(entry.monthly[month] + value);
  block.monthly[month] = roundMoney(block.monthly[month] + value);
}

function sumMonthly(monthly) {
  return roundMoney(ANNUAL_MONTHS.reduce((sum, month) => sum + Number(monthly?.[month] || 0), 0));
}

function finalizeEntries(entryMap, revenueTotal) {
  return Array.from(entryMap.values())
    .map((entry) => {
      const total = sumMonthly(entry.monthly);
      return {
        ...entry,
        total,
        revenuePercentage: percentage(total, revenueTotal)
      };
    })
    .sort((a, b) => {
      const groupComparison = a.groupLabel.localeCompare(b.groupLabel, 'pt-BR', { sensitivity: 'base' });
      if (groupComparison !== 0) return groupComparison;
      return a.label.localeCompare(b.label, 'pt-BR', { sensitivity: 'base' });
    });
}

export function buildAnnualFinancialSummary({ rows = [], year }) {
  const blocks = ANNUAL_BLOCKS.map((config) => ({
    ...config,
    monthly: emptyMonthly(),
    entryMap: new Map()
  }));
  const blocksByKey = new Map(blocks.map((block) => [block.key, block]));

  rows.forEach((row) => {
    const month = String(row?.month || '').padStart(2, '0');
    if (!ANNUAL_MONTHS.includes(month)) return;

    const data = normalizeFinancialData(row?.data);
    ANNUAL_BLOCKS.forEach(({ key }) => {
      const block = blocksByKey.get(key);
      if (key === 'contas') {
        (Array.isArray(data.contas) ? data.contas : []).forEach((group) => {
          (Array.isArray(group?.subcats) ? group.subcats : []).forEach((item) => {
            addRealizedEntry(block, month, item, group?.nome);
          });
        });
        return;
      }

      (Array.isArray(data[key]) ? data[key] : []).forEach((item) => addRealizedEntry(block, month, item));
    });
  });

  const revenueBlock = blocksByKey.get('receitas');
  const revenueTotal = sumMonthly(revenueBlock.monthly);
  const finalizedBlocks = blocks.map(({ entryMap, ...block }) => {
    const total = sumMonthly(block.monthly);
    return {
      ...block,
      total,
      revenuePercentage: percentage(total, revenueTotal),
      entries: finalizeEntries(entryMap, revenueTotal)
    };
  });

  const expenseBlocks = finalizedBlocks.filter((block) => block.type === 'expense');
  const expenseMonthly = Object.fromEntries(
    ANNUAL_MONTHS.map((month) => [
      month,
      roundMoney(expenseBlocks.reduce((sum, block) => sum + Number(block.monthly[month] || 0), 0))
    ])
  );
  const balanceMonthly = Object.fromEntries(
    ANNUAL_MONTHS.map((month) => [
      month,
      roundMoney(Number(revenueBlock.monthly[month] || 0) - Number(expenseMonthly[month] || 0))
    ])
  );
  const expenseTotal = sumMonthly(expenseMonthly);
  const balanceTotal = sumMonthly(balanceMonthly);

  return {
    year: String(year || ''),
    months: ANNUAL_MONTHS,
    blocks: finalizedBlocks,
    totals: {
      revenue: revenueTotal,
      expenses: expenseTotal,
      balance: balanceTotal,
      expensePercentage: percentage(expenseTotal, revenueTotal),
      balancePercentage: percentage(balanceTotal, revenueTotal),
      expenseMonthly,
      balanceMonthly
    }
  };
}

export async function loadAnnualFinancialSummary({ supabase, userId, year }) {
  const { data, error } = await supabase
    .from('financial_data')
    .select('month,data,updated_at')
    .eq('user_id', userId)
    .eq('year', year)
    .order('month', { ascending: true });

  if (error) throw new Error(error.message || 'Erro ao carregar resumo financeiro anual');
  return buildAnnualFinancialSummary({ rows: data || [], year });
}
