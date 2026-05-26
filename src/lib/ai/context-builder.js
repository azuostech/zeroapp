import { getServiceSupabase } from '@/src/lib/supabase/service';
import { getFaseAtual } from '@/src/modules/coins/domain/jornada-phases';

function pad2(value) {
  return String(value).padStart(2, '0');
}

function parseAmount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;

  const raw = value.trim();
  if (!raw) return 0;

  const compact = raw.replace(/[^\d,.-]/g, '');
  if (!compact) return 0;

  const normalized = compact.includes(',') ? compact.replace(/\./g, '').replace(',', '.') : compact;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isRealized(item) {
  if (!item || typeof item !== 'object') return false;
  if (typeof item.realized === 'boolean') return item.realized;

  const normalized = String(item.realized || '')
    .trim()
    .toLowerCase();

  return ['true', 't', '1', 'yes', 'y', 'sim'].includes(normalized);
}

function sanitizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function calcSimple(itens = []) {
  const list = toArray(itens);

  return list.reduce(
    (acc, item) => {
      const previstoBase = item?.valor_previsto ?? item?.valor;
      const realizadoBase = item?.valor_realizado ?? item?.valor;

      const previsto = parseAmount(previstoBase);
      const realized = isRealized(item);
      const realizado = realized ? parseAmount(realizadoBase) : 0;

      acc.previsto += previsto;
      acc.realizado += realizado;
      acc.total += 1;
      if (realized) acc.realizados += 1;

      return acc;
    },
    { previsto: 0, realizado: 0, pendentes: 0, total: 0, realizados: 0 }
  );
}

function calcContas(contas = []) {
  const itens = toArray(contas).flatMap((grupo) => (Array.isArray(grupo?.subcats) ? grupo.subcats : []));
  return calcSimple(itens);
}

function finalizeBlockStats(stats) {
  return {
    ...stats,
    pendentes: Math.max(0, Number(stats.total || 0) - Number(stats.realizados || 0))
  };
}

function calcTotals(data = {}) {
  const receitas = finalizeBlockStats(calcSimple(data.receitas));
  const pagarPrimeiro = finalizeBlockStats(calcSimple(data['pagar-primeiro']));
  const doar = finalizeBlockStats(calcSimple(data.doar));
  const contas = finalizeBlockStats(calcContas(data.contas));
  const investimentos = finalizeBlockStats(calcSimple(data.investimentos));
  const desfrute = finalizeBlockStats(calcSimple(data.desfrute));

  const allBlocks = [receitas, pagarPrimeiro, doar, contas, investimentos, desfrute];
  const hasAny = allBlocks.some((block) => block.total > 0 || block.previsto > 0 || block.realizado > 0);

  return {
    receitas,
    pagarPrimeiro,
    doar,
    contas,
    investimentos,
    desfrute,
    hasAny
  };
}

function buildPeriodWindow(now) {
  const date = now instanceof Date ? now : new Date();

  const month = pad2(date.getMonth() + 1);
  const year = String(date.getFullYear());

  const previousDate = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const previousMonth = pad2(previousDate.getMonth() + 1);
  const previousYear = String(previousDate.getFullYear());

  return {
    month,
    year,
    previousMonth,
    previousYear,
    label: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    monthName: date.toLocaleDateString('pt-BR', { month: 'long' })
  };
}

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Number(value || 0));
}

function formatPercent(realizado, previsto) {
  if (!previsto || previsto <= 0) return '—';
  return `${Math.round((realizado / previsto) * 100)}%`;
}

function mapGains(gains) {
  if (!Array.isArray(gains) || gains.length === 0) {
    return '- Nenhum ganho registrado ainda';
  }

  return gains
    .map((item) => {
      const descricao = sanitizeText(item?.descricao);
      const tamanho = sanitizeText(item?.tamanho).toUpperCase() || 'REGISTRO';
      return `- [${tamanho}] ${descricao || 'Ganho sem descrição'}`;
    })
    .join('\n');
}

function mapGratitude(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return '- Nenhuma gratidão registrada ainda';
  }

  return entries
    .map((item) => {
      const descricao = sanitizeText(item?.descricao);
      const categoria = sanitizeText(item?.categoria).toUpperCase() || 'GERAL';
      return `- [${categoria}] ${descricao || 'Registro sem descrição'}`;
    })
    .join('\n');
}

function mapIdentity(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    return '- Nenhuma declaração registrada ainda';
  }

  return entries
    .map((item) => {
      const declaracao = sanitizeText(item?.declaracao);
      return `- "Eu sou ${declaracao || '...'}"`;
    })
    .join('\n');
}

function resolveSupabaseClient(preferred) {
  if (preferred) return preferred;

  try {
    return getServiceSupabase();
  } catch (_) {
    return null;
  }
}

function readData(result, fallbackValue) {
  if (result?.error) return fallbackValue;
  if (result?.data === null || result?.data === undefined) return fallbackValue;
  return result.data;
}

export async function buildUserContext(userId, options = {}) {
  if (!userId) {
    throw new Error('missing_user_id');
  }

  const supabase = resolveSupabaseClient(options?.supabase);
  if (!supabase) {
    throw new Error('missing_supabase_client');
  }
  const period = buildPeriodWindow(options?.now);

  const [profileRes, coinsRes, financialCurrentRes, financialPreviousRes, gainsRes, gratitudeRes, identityRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, tier, turma')
      .eq('id', userId)
      .maybeSingle(),

    supabase
      .from('coins_balance')
      .select('coins, coins_total')
      .eq('user_id', userId)
      .maybeSingle(),

    supabase
      .from('financial_data')
      .select('data')
      .eq('user_id', userId)
      .eq('month', period.month)
      .eq('year', period.year)
      .maybeSingle(),

    supabase
      .from('financial_data')
      .select('data')
      .eq('user_id', userId)
      .eq('month', period.previousMonth)
      .eq('year', period.previousYear)
      .maybeSingle(),

    supabase
      .from('gains')
      .select('descricao, tamanho, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('gratitude_entries')
      .select('descricao, categoria, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),

    supabase
      .from('identity_declarations')
      .select('declaracao, contexto, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(3)
  ]);

  const profile = readData(profileRes, null);
  const coins = readData(coinsRes, { coins: 0, coins_total: 0 });
  const currentData = readData(financialCurrentRes, null)?.data || {};
  const previousData = readData(financialPreviousRes, null)?.data || {};
  const gains = readData(gainsRes, []);
  const gratitude = readData(gratitudeRes, []);
  const identity = readData(identityRes, []);

  const currentTotals = calcTotals(currentData);
  const previousTotals = calcTotals(previousData);

  const saldoRealizado =
    currentTotals.receitas.realizado -
    currentTotals.contas.realizado -
    currentTotals.pagarPrimeiro.realizado -
    currentTotals.doar.realizado -
    currentTotals.investimentos.realizado -
    currentTotals.desfrute.realizado;

  const saldoPrevisto =
    currentTotals.receitas.previsto -
    currentTotals.contas.previsto -
    currentTotals.pagarPrimeiro.previsto -
    currentTotals.doar.previsto -
    currentTotals.investimentos.previsto -
    currentTotals.desfrute.previsto;

  const faseAtual = getFaseAtual(Number(coins?.coins_total || 0));

  const comparativoAnterior = previousTotals.hasAny
    ? `
## COMPARATIVO - MÊS ANTERIOR

| Bloco | Realizado anterior |
|-------|--------------------|
| Receitas | ${formatMoney(previousTotals.receitas.realizado)} |
| Se Pagar Primeiro | ${formatMoney(previousTotals.pagarPrimeiro.realizado)} |
| Pagar Contas | ${formatMoney(previousTotals.contas.realizado)} |
| Desfrute | ${formatMoney(previousTotals.desfrute.realizado)} |
`
    : '';

  return `
## DADOS DO USUÁRIO - ${period.label}

**Nome:** ${sanitizeText(profile?.full_name) || 'Usuário'}
**Tier:** ${sanitizeText(profile?.tier) || 'DESPERTAR'}
**Turma:** ${sanitizeText(profile?.turma) || 'não atribuída'}
**ZeroCoins:** ${Number(coins?.coins || 0)} disponíveis / ${Number(coins?.coins_total || 0)} acumulados total
**Fase da jornada:** ${faseAtual.nome} ${faseAtual.emoji}

---

## FINANÇAS - ${period.monthName.toUpperCase()} (mês atual)

| Bloco | Previsto | Realizado | % | Pendentes |
|-------|----------|-----------|---|-----------|
| Receitas | ${formatMoney(currentTotals.receitas.previsto)} | ${formatMoney(currentTotals.receitas.realizado)} | ${formatPercent(currentTotals.receitas.realizado, currentTotals.receitas.previsto)} | ${currentTotals.receitas.pendentes} itens |
| Se Pagar Primeiro | ${formatMoney(currentTotals.pagarPrimeiro.previsto)} | ${formatMoney(currentTotals.pagarPrimeiro.realizado)} | ${formatPercent(currentTotals.pagarPrimeiro.realizado, currentTotals.pagarPrimeiro.previsto)} | ${currentTotals.pagarPrimeiro.pendentes} itens |
| Doação | ${formatMoney(currentTotals.doar.previsto)} | ${formatMoney(currentTotals.doar.realizado)} | ${formatPercent(currentTotals.doar.realizado, currentTotals.doar.previsto)} | ${currentTotals.doar.pendentes} itens |
| Pagar Contas | ${formatMoney(currentTotals.contas.previsto)} | ${formatMoney(currentTotals.contas.realizado)} | ${formatPercent(currentTotals.contas.realizado, currentTotals.contas.previsto)} | ${currentTotals.contas.pendentes} itens |
| Investimentos | ${formatMoney(currentTotals.investimentos.previsto)} | ${formatMoney(currentTotals.investimentos.realizado)} | ${formatPercent(currentTotals.investimentos.realizado, currentTotals.investimentos.previsto)} | ${currentTotals.investimentos.pendentes} itens |
| Desfrute | ${formatMoney(currentTotals.desfrute.previsto)} | ${formatMoney(currentTotals.desfrute.realizado)} | ${formatPercent(currentTotals.desfrute.realizado, currentTotals.desfrute.previsto)} | ${currentTotals.desfrute.pendentes} itens |

**Saldo realizado:** ${formatMoney(saldoRealizado)}
**Saldo previsto:** ${formatMoney(saldoPrevisto)}

${comparativoAnterior}

---

## PRÁTICAS RECENTES

**Últimos ganhos registrados:**
${mapGains(gains)}

**Últimas gratidões:**
${mapGratitude(gratitude)}

**Declarações de identidade (mais recentes):**
${mapIdentity(identity)}
`.trim();
}
