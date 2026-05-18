import {
  cloneDefaultFinancialData,
  createContaSubcat,
  createFinanceItem,
  normalizeFinancialData
} from '@/src/modules/finance/domain/defaults';

const SIMPLE_BLOCKS = new Set(['receitas', 'pagar-primeiro', 'doar', 'investimentos', 'desfrute']);

const OPERATION_TYPES = new Set([
  'add_category',
  'remove_category',
  'add_group',
  'remove_group',
  'add_subcategory',
  'remove_subcategory'
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

  existing.forEach((row) => {
    if (row.month === currentMonth && row.year === currentYear) return;
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

  if (!updates.length) return { affectedMonths: 0 };

  const { error: upsertError } = await supabase
    .from('financial_data')
    .upsert(updates, { onConflict: 'user_id,month,year' });

  if (upsertError) throw new Error(upsertError.message || 'Erro ao replicar estrutura');

  return { affectedMonths: updates.length };
}
