import {
  SIMPLE_BLOCK_KEYS,
  cloneDefaultFinancialData,
  isNumericValueString,
  normalizeFinancialData
} from '@/src/modules/finance/domain/defaults';

export function validateMonthYear(month, year) {
  const isMonthOk = typeof month === 'string' && /^(0[1-9]|1[0-2])$/.test(month);
  const isYearOk = typeof year === 'string' && /^\d{4}$/.test(year);
  return isMonthOk && isYearOk;
}

export async function loadFinancialMonth({ supabase, userId, month, year }) {
  const { data, error } = await supabase
    .from('financial_data')
    .select('data')
    .eq('user_id', userId)
    .eq('month', month)
    .eq('year', year)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Erro ao carregar dados');

  if (!data?.data || Object.keys(data.data).length === 0) {
    return cloneDefaultFinancialData();
  }

  return normalizeFinancialData(data.data);
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateSimpleItem(item, path) {
  if (!isObject(item)) {
    return `${path} precisa ser um objeto válido`;
  }

  const valorPrevisto = item.valor_previsto ?? item.valor ?? '0';
  const valorRealizado = item.valor_realizado ?? '0';

  if (!isNumericValueString(valorPrevisto)) {
    return `${path}.valor_previsto inválido`;
  }

  if (!isNumericValueString(valorRealizado)) {
    return `${path}.valor_realizado inválido`;
  }

  if (typeof item.realized !== 'boolean') {
    return `${path}.realized inválido`;
  }

  return null;
}

export function validateFinancialDataPayload(data) {
  if (!isObject(data)) return 'data inválido';

  for (const blockKey of SIMPLE_BLOCK_KEYS) {
    const list = Array.isArray(data[blockKey]) ? data[blockKey] : [];
    for (let idx = 0; idx < list.length; idx += 1) {
      const error = validateSimpleItem(list[idx], `${blockKey}[${idx}]`);
      if (error) return error;
    }
  }

  const groups = Array.isArray(data.contas) ? data.contas : [];
  for (let gi = 0; gi < groups.length; gi += 1) {
    const group = groups[gi];
    if (!isObject(group)) {
      return `contas[${gi}] precisa ser um objeto válido`;
    }

    const subcats = Array.isArray(group.subcats) ? group.subcats : [];
    for (let si = 0; si < subcats.length; si += 1) {
      const error = validateSimpleItem(subcats[si], `contas[${gi}].subcats[${si}]`);
      if (error) return error;
    }
  }

  return null;
}

export async function saveFinancialMonth({ supabase, userId, month, year, data }) {
  const normalized = normalizeFinancialData(data);
  const validationError = validateFinancialDataPayload(normalized);
  if (validationError) {
    throw new Error(validationError);
  }

  const { error } = await supabase.from('financial_data').upsert(
    {
      user_id: userId,
      month,
      year,
      data: normalized,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'user_id,month,year' }
  );

  if (error) throw new Error(error.message || 'Erro ao salvar dados');
}
