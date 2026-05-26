import { getServiceSupabase } from '@/src/lib/supabase/service';
import { getFaseAtual, getProximaFase } from '@/src/modules/coins/domain/jornada-phases';

function pad2(value) {
  return String(value).padStart(2, '0');
}

function resolvePeriodWindow(mesRef, anoRef) {
  const monthNum = Number(mesRef);
  const yearNum = Number(anoRef);

  if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    throw new Error('invalid_month_reference');
  }

  if (!Number.isInteger(yearNum) || yearNum < 1970) {
    throw new Error('invalid_year_reference');
  }

  const month = pad2(monthNum);
  const year = String(yearNum);
  const start = new Date(Date.UTC(yearNum, monthNum - 1, 1, 0, 0, 0, 0));
  const endExclusive = new Date(Date.UTC(yearNum, monthNum, 1, 0, 0, 0, 0));

  return {
    month,
    year,
    startIso: start.toISOString(),
    endExclusiveIso: endExclusive.toISOString()
  };
}

function parseAmount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return 0;

  const raw = value.trim();
  if (!raw) return 0;

  const compact = raw.replace(/[^\d,.-]/g, '');
  if (!compact) return 0;

  const normalized = compact.includes(',')
    ? compact.replace(/\./g, '').replace(',', '.')
    : compact;

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

function calcBloco(itens = []) {
  return (Array.isArray(itens) ? itens : []).reduce(
    (acc, item) => {
      const previstoBase = item?.valor_previsto ?? item?.valor;
      const realizadoBase = item?.valor_realizado ?? item?.valor;

      acc.previsto += parseAmount(previstoBase);

      if (isRealized(item)) {
        acc.realizado += parseAmount(realizadoBase);
      }

      return acc;
    },
    { previsto: 0, realizado: 0 }
  );
}

function ensureNoQueryErrors(results) {
  const queryErrors = results
    .filter((result) => result?.error)
    .map((result) => result.error?.message)
    .filter(Boolean);

  if (queryErrors.length > 0) {
    throw new Error(queryErrors[0]);
  }
}

export async function coletarDadosUsuario(userId, mesRef, anoRef) {
  const supabase = getServiceSupabase();
  const { month, year, startIso, endExclusiveIso } = resolvePeriodWindow(mesRef, anoRef);

  const [profileRes, coinsRes, financialRes, gainsRes, gratitudeRes, identityRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, tier, turma, status')
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
      .eq('month', month)
      .eq('year', year)
      .maybeSingle(),

    supabase
      .from('gains')
      .select('id, descricao, tamanho, created_at')
      .eq('user_id', userId)
      .gte('created_at', startIso)
      .lt('created_at', endExclusiveIso)
      .order('created_at', { ascending: false }),

    supabase
      .from('gratitude_entries')
      .select('id, descricao, categoria, created_at')
      .eq('user_id', userId)
      .gte('created_at', startIso)
      .lt('created_at', endExclusiveIso)
      .order('created_at', { ascending: false }),

    supabase
      .from('identity_declarations')
      .select('id, declaracao, contexto, encontro_ref, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
  ]);

  ensureNoQueryErrors([profileRes, coinsRes, financialRes, gainsRes, gratitudeRes, identityRes]);

  const profile = profileRes.data || null;
  const coins = coinsRes.data || { coins: 0, coins_total: 0 };
  const financial = financialRes.data || null;
  const gains = gainsRes.data || [];
  const gratitude = gratitudeRes.data || [];
  const identity = identityRes.data || [];

  const data = financial?.data || {};

  const receitasCalc = calcBloco(data.receitas);
  const pagarPrimeiroCalc = calcBloco(data['pagar-primeiro']);
  const doarCalc = calcBloco(data.doar);
  const investimentosCalc = calcBloco(data.investimentos);
  const desfruteCalc = calcBloco(data.desfrute);

  const contasItens = (Array.isArray(data.contas) ? data.contas : []).flatMap((grupo) =>
    Array.isArray(grupo?.subcats) ? grupo.subcats : []
  );
  const contasCalc = calcBloco(contasItens);

  const totalReceitaRealizada = receitasCalc.realizado;
  const totalReceitaPrevista = receitasCalc.previsto;

  const totalGastoRealizado =
    pagarPrimeiroCalc.realizado +
    doarCalc.realizado +
    contasCalc.realizado +
    investimentosCalc.realizado +
    desfruteCalc.realizado;

  const totalGastoPrevisto =
    pagarPrimeiroCalc.previsto +
    doarCalc.previsto +
    contasCalc.previsto +
    investimentosCalc.previsto +
    desfruteCalc.previsto;

  const saldoRealizado = totalReceitaRealizada - totalGastoRealizado;
  const saldoPrevisto = totalReceitaPrevista - totalGastoPrevisto;

  const coinsAtual = Number(coins?.coins || 0);
  const coinsTotal = Number(coins?.coins_total || 0);
  const fase = getFaseAtual(coinsTotal);
  const proximaFase = getProximaFase(coinsTotal);
  const coinsParaProxima = proximaFase ? Math.max(0, Number(proximaFase.min || 0) - coinsTotal) : 0;

  return {
    profile,
    coins: {
      atual: coinsAtual,
      total: coinsTotal,
      ganhosMes: 0
    },
    financeiro: {
      mes: month,
      ano: year,
      totalReceitaRealizada,
      totalReceitaPrevista,
      totalGastoRealizado,
      totalGastoPrevisto,
      saldoRealizado,
      saldoPrevisto
    },
    praticas: {
      gains,
      gainsMes: gains.length,
      maiorGanho: gains.find((gain) => gain.tamanho === 'grande') || gains[0] || null,
      gratitude,
      gratitudeMes: gratitude.length,
      maiorGratidao: gratitude[0] || null,
      ultimaIdentidade: identity[0] || null
    },
    jornada: {
      fase,
      proximaFase,
      coinsParaProxima
    }
  };
}

export async function coletarResumoJornada(userId) {
  const supabase = getServiceSupabase();

  const [profileRes, coinsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, status, tier, turma')
      .eq('id', userId)
      .maybeSingle(),

    supabase
      .from('coins_balance')
      .select('coins, coins_total')
      .eq('user_id', userId)
      .maybeSingle()
  ]);

  ensureNoQueryErrors([profileRes, coinsRes]);

  const profile = profileRes.data || null;
  const coinsAtual = Number(coinsRes.data?.coins || 0);
  const coinsTotal = Number(coinsRes.data?.coins_total || 0);

  const fase = getFaseAtual(coinsTotal);
  const proximaFase = getProximaFase(coinsTotal);
  const coinsParaProxima = proximaFase ? Math.max(0, Number(proximaFase.min || 0) - coinsTotal) : 0;

  return {
    profile,
    coins: {
      atual: coinsAtual,
      total: coinsTotal
    },
    jornada: {
      fase,
      proximaFase,
      coinsParaProxima
    }
  };
}
