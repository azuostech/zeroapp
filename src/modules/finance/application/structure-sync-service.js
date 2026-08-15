import {
  cloneDefaultFinancialData,
  createContaSubcat,
  createFinanceItem,
  isNumericValueString,
  normalizeFinancialData
} from '../domain/defaults';

const SIMPLE_BLOCKS = new Set(['receitas', 'pagar-primeiro', 'doar', 'investimentos', 'desfrute']);

const OPERATION_TYPES = new Set([
  'add_category',
  'remove_category',
  'add_group',
  'remove_group',
  'add_subcategory',
  'remove_subcategory',
  'update_category',
  'update_subcategory'
]);

function cleanName(value) {
  return String(value || '').trim();
}

function sameName(a, b) {
  return cleanName(a).localeCompare(cleanName(b), 'pt-BR', { sensitivity: 'base' }) === 0;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asGroups(value) {
  return asArray(value).map((group) => ({
    ...group,
    subcats: asArray(group?.subcats)
  }));
}

function addSimpleCategory(data, bloco, nome) {
  const list = asArray(data[bloco]);
  if (list.some((item) => sameName(item?.nome, nome))) return false;
  list.push(createFinanceItem(nome, '0'));
  data[bloco] = list;
  return true;
}

function removeSimpleCategory(data, bloco, nome) {
  const list = asArray(data[bloco]);
  const next = list.filter((item) => !sameName(item?.nome, nome));
  const changed = next.length !== list.length;
  if (changed) data[bloco] = next;
  return changed;
}

function addGroup(data, nome) {
  const groups = asGroups(data.contas);
  if (groups.some((group) => sameName(group?.nome, nome))) return false;
  groups.push({ nome, subcats: [] });
  data.contas = groups;
  return true;
}

function removeGroup(data, nome) {
  const groups = asGroups(data.contas);
  const next = groups.filter((group) => !sameName(group?.nome, nome));
  const changed = next.length !== groups.length;
  if (changed) data.contas = next;
  return changed;
}

function addSubcategory(data, groupName, nome) {
  const groups = asGroups(data.contas);
  let group = groups.find((item) => sameName(item?.nome, groupName));

  if (!group) {
    group = { nome: groupName, subcats: [] };
    groups.push(group);
  }

  if (asArray(group.subcats).some((item) => sameName(item?.nome, nome))) return false;
  group.subcats.push(createContaSubcat(nome, '0'));
  data.contas = groups;
  return true;
}

function removeSubcategory(data, groupName, nome) {
  const groups = asGroups(data.contas);
  const group = groups.find((item) => sameName(item?.nome, groupName));
  if (!group) return false;

  const before = asArray(group.subcats);
  const next = before.filter((item) => !sameName(item?.nome, nome));
  const changed = next.length !== before.length;
  if (changed) group.subcats = next;
  data.contas = groups;
  return changed;
}

function updatePlannedItem(item, nome, valorPrevisto) {
  const changed = item.nome !== nome || item.valor_previsto !== valorPrevisto || item.valor !== valorPrevisto;
  if (!changed) return false;

  item.nome = nome;
  item.valor_previsto = valorPrevisto;
  item.valor = valorPrevisto;
  return true;
}

function asOptionalIndex(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function findItemByNameOrIndex(list, oldName, index) {
  return list.find((candidate) => sameName(candidate?.nome, oldName)) || (index === null ? null : list[index]);
}

function updateSimpleCategory(data, bloco, oldName, nome, valorPrevisto, itemIndex) {
  const list = asArray(data[bloco]);
  const item = findItemByNameOrIndex(list, oldName, itemIndex);
  if (!item) return false;
  return updatePlannedItem(item, nome, valorPrevisto);
}

function updateSubcategory(data, groupName, oldName, nome, valorPrevisto, groupIndex, subcatIndex) {
  const groups = asGroups(data.contas);
  const group = groups.find((candidate) => sameName(candidate?.nome, groupName)) ||
    (groupIndex === null ? null : groups[groupIndex]);
  if (!group) return false;

  const item = findItemByNameOrIndex(asArray(group.subcats), oldName, subcatIndex);
  if (!item) return false;
  return updatePlannedItem(item, nome, valorPrevisto);
}

function parsePlannedUpdate(input, type) {
  const oldName = cleanName(input.oldName);
  const nome = cleanName(input.nome);
  const valorPrevisto = typeof input.valorPrevisto === 'string'
    ? input.valorPrevisto.trim()
    : String(input.valorPrevisto ?? '').trim();

  if (!oldName) return { ok: false, reason: 'invalid_old_name' };
  if (!nome) return { ok: false, reason: 'invalid_nome' };
  if (!isNumericValueString(valorPrevisto)) return { ok: false, reason: 'invalid_valor_previsto' };
  if (type === 'update_category') {
    const bloco = cleanName(input.bloco);
    if (!SIMPLE_BLOCKS.has(bloco)) return { ok: false, reason: 'invalid_bloco' };
    return {
      ok: true,
      value: { type, bloco, oldName, nome, valorPrevisto, itemIndex: asOptionalIndex(input.itemIndex) }
    };
  }

  const groupName = cleanName(input.groupName);
  if (!groupName) return { ok: false, reason: 'invalid_group_name' };
  return {
    ok: true,
    value: {
      type,
      groupName,
      oldName,
      nome,
      valorPrevisto,
      groupIndex: asOptionalIndex(input.groupIndex),
      subcatIndex: asOptionalIndex(input.subcatIndex)
    }
  };
}

export function parseStructureOperation(input) {
  if (!input || typeof input !== 'object') return { ok: false, reason: 'invalid_operation' };
  if (!OPERATION_TYPES.has(input.type)) return { ok: false, reason: 'invalid_operation_type' };

  if (input.type === 'add_category' || input.type === 'remove_category') {
    const bloco = cleanName(input.bloco);
    const nome = cleanName(input.nome);
    if (!SIMPLE_BLOCKS.has(bloco)) return { ok: false, reason: 'invalid_bloco' };
    if (!nome) return { ok: false, reason: 'invalid_nome' };
    return { ok: true, value: { type: input.type, bloco, nome } };
  }

  if (input.type === 'add_group' || input.type === 'remove_group') {
    const nome = cleanName(input.nome);
    if (!nome) return { ok: false, reason: 'invalid_nome' };
    return { ok: true, value: { type: input.type, nome } };
  }

  if (input.type === 'add_subcategory' || input.type === 'remove_subcategory') {
    const groupName = cleanName(input.groupName);
    const nome = cleanName(input.nome);
    if (!groupName) return { ok: false, reason: 'invalid_group_name' };
    if (!nome) return { ok: false, reason: 'invalid_nome' };
    return { ok: true, value: { type: input.type, groupName, nome } };
  }

  if (input.type === 'update_category' || input.type === 'update_subcategory') {
    return parsePlannedUpdate(input, input.type);
  }

  return { ok: false, reason: 'invalid_operation' };
}

export function applyStructureOperation(sourceData, operation) {
  const data = JSON.parse(JSON.stringify(normalizeFinancialData(sourceData)));
  let changed = false;

  switch (operation.type) {
    case 'add_category':
      changed = addSimpleCategory(data, operation.bloco, operation.nome);
      break;
    case 'remove_category':
      changed = removeSimpleCategory(data, operation.bloco, operation.nome);
      break;
    case 'add_group':
      changed = addGroup(data, operation.nome);
      break;
    case 'remove_group':
      changed = removeGroup(data, operation.nome);
      break;
    case 'add_subcategory':
      changed = addSubcategory(data, operation.groupName, operation.nome);
      break;
    case 'remove_subcategory':
      changed = removeSubcategory(data, operation.groupName, operation.nome);
      break;
    case 'update_category':
      changed = updateSimpleCategory(
        data,
        operation.bloco,
        operation.oldName,
        operation.nome,
        operation.valorPrevisto,
        operation.itemIndex
      );
      break;
    case 'update_subcategory':
      changed = updateSubcategory(
        data,
        operation.groupName,
        operation.oldName,
        operation.nome,
        operation.valorPrevisto,
        operation.groupIndex,
        operation.subcatIndex
      );
      break;
    default:
      changed = false;
  }

  return { data, changed };
}

function buildYearMonths(year) {
  const months = [];
  for (let i = 1; i <= 12; i += 1) {
    months.push({ year, month: String(i).padStart(2, '0') });
  }
  return months;
}

function shouldCreateMissingMonths(operation) {
  return operation.type.startsWith('add_');
}

function isPlannedUpdate(operation) {
  return operation.type === 'update_category' || operation.type === 'update_subcategory';
}

export function isFuturePeriod(month, year, currentMonth, currentYear) {
  return `${year}-${month}` > `${currentYear}-${currentMonth}`;
}

function resetRealizedValues(sourceData) {
  const data = JSON.parse(JSON.stringify(normalizeFinancialData(sourceData)));
  Object.keys(data).forEach((key) => {
    if (key === 'contas') return;
    asArray(data[key]).forEach((item) => {
      item.realized = false;
      item.valor_realizado = '0';
    });
  });
  asGroups(data.contas).forEach((group) => {
    asArray(group.subcats).forEach((item) => {
      item.realized = false;
      item.valor_realizado = '0';
    });
  });
  return data;
}

export async function replicateStructureOperation({
  supabase,
  userId,
  currentMonth,
  currentYear,
  operation
}) {
  const { data: rows, error } = await supabase
    .from('financial_data')
    .select('month,year,data')
    .eq('user_id', userId);

  if (error) throw new Error(error.message || 'Erro ao carregar meses para replicação');

  const nowIso = new Date().toISOString();
  const existing = rows || [];
  const existingKeys = new Set(existing.map((row) => `${row.year}-${row.month}`));
  const updates = [];
  const plannedUpdate = isPlannedUpdate(operation);
  const currentRow = existing.find((row) => row.month === currentMonth && row.year === currentYear);

  existing.forEach((row) => {
    if (row.month === currentMonth && row.year === currentYear) return;
    if (plannedUpdate && !isFuturePeriod(row.month, row.year, currentMonth, currentYear)) return;
    const result = applyStructureOperation(row.data, operation);
    if (!result.changed) return;
    updates.push({
      user_id: userId,
      month: row.month,
      year: row.year,
      data: result.data,
      updated_at: nowIso
    });
  });

  if (shouldCreateMissingMonths(operation)) {
    const targets = buildYearMonths(currentYear);
    targets.forEach(({ year, month }) => {
      if (month === currentMonth && year === currentYear) return;
      const key = `${year}-${month}`;
      if (existingKeys.has(key)) return;

      const base = cloneDefaultFinancialData();
      const result = applyStructureOperation(base, operation);
      if (!result.changed) return;

      updates.push({
        user_id: userId,
        month,
        year,
        data: result.data,
        updated_at: nowIso
      });
    });
  }

  if (plannedUpdate) {
    const source = currentRow?.data || cloneDefaultFinancialData();
    const sourceResult = applyStructureOperation(source, operation);
    if (sourceResult.changed) {
      buildYearMonths(currentYear).forEach(({ year, month }) => {
        if (!isFuturePeriod(month, year, currentMonth, currentYear)) return;
        if (existingKeys.has(`${year}-${month}`)) return;

        updates.push({
          user_id: userId,
          month,
          year,
          data: resetRealizedValues(sourceResult.data),
          updated_at: nowIso
        });
      });
    }
  }

  if (!updates.length) return { affectedMonths: 0 };

  const { error: upsertError } = await supabase
    .from('financial_data')
    .upsert(updates, { onConflict: 'user_id,month,year' });

  if (upsertError) throw new Error(upsertError.message || 'Erro ao replicar estrutura');

  return { affectedMonths: updates.length };
}
