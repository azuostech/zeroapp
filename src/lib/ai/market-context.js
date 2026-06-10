const TIME_ZONE = 'America/Sao_Paulo';
const CACHE_TTL_MS = 15 * 60 * 1000;
const FETCH_TIMEOUT_MS = 3500;
const SGS_BASE_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs';
const PTAX_BASE_URL = 'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata';

const SGS_INDICATORS = [
  {
    key: 'selic_meta',
    label: 'Meta Selic definida pelo Copom',
    code: 432,
    unit: '% ao ano',
    precision: 2,
    windowDays: 180
  },
  {
    key: 'ipca_mensal',
    label: 'IPCA mensal',
    code: 433,
    unit: '% no mês',
    precision: 2,
    windowDays: 540
  },
  {
    key: 'ipca_12m',
    label: 'IPCA acumulado em 12 meses',
    code: 13522,
    unit: '% em 12 meses',
    precision: 2,
    windowDays: 540
  },
  {
    key: 'cdi_diario',
    label: 'CDI diário',
    code: 12,
    unit: '% ao dia',
    precision: 4,
    windowDays: 45
  }
];

let indicatorCache = null;

function asDate(value) {
  return value instanceof Date && !Number.isNaN(value.getTime()) ? value : new Date();
}

function getZonedDateParts(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(asDate(date));

  const mapped = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: mapped.year,
    month: mapped.month,
    day: mapped.day
  };
}

function getSaoPauloIsoDate(date) {
  const parts = getZonedDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function shiftIsoDate(isoDate, days) {
  const [year, month, day] = String(isoDate || '')
    .split('-')
    .map((value) => Number.parseInt(value, 10));

  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);

  const shiftedYear = String(date.getUTCFullYear());
  const shiftedMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const shiftedDay = String(date.getUTCDate()).padStart(2, '0');

  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
}

function brDateFromIso(isoDate) {
  const [year, month, day] = String(isoDate || '').split('-');
  return `${day}/${month}/${year}`;
}

function isoFromBrDate(dateValue) {
  const match = String(dateValue || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function parseBcbNumber(value) {
  const parsed = Number.parseFloat(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value, precision) {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision
  }).format(Number(value || 0));
}

function formatCurrentDateTime(now) {
  const date = asDate(now);

  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: TIME_ZONE,
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

async function fetchJson(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        accept: 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`bcb_http_${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

function buildSgsWindowUrl(code, startIso, endIso) {
  const dataInicial = encodeURIComponent(brDateFromIso(startIso));
  const dataFinal = encodeURIComponent(brDateFromIso(endIso));
  return `${SGS_BASE_URL}.${code}/dados?formato=json&dataInicial=${dataInicial}&dataFinal=${dataFinal}`;
}

function buildSgsLatestUrl(code) {
  return `${SGS_BASE_URL}.${code}/dados/ultimos/1?formato=json`;
}

function ptaxDateFromIso(isoDate) {
  const [year, month, day] = String(isoDate || '').split('-');
  return `${month}-${day}-${year}`;
}

function buildPtaxDollarUrl(isoDate) {
  return `${PTAX_BASE_URL}/CotacaoDolarDia(dataCotacao=@dataCotacao)?@dataCotacao='${ptaxDateFromIso(isoDate)}'&$top=1&$format=json`;
}

function normalizeRows(rows, todayIso) {
  if (!Array.isArray(rows)) return [];

  return rows
    .map((row) => {
      const isoDate = isoFromBrDate(row?.data);
      const value = parseBcbNumber(row?.valor);

      if (!isoDate || value === null || isoDate > todayIso) {
        return null;
      }

      return {
        isoDate,
        date: row.data,
        value
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.isoDate.localeCompare(b.isoDate));
}

async function fetchSgsIndicator(indicator, now) {
  const todayIso = getSaoPauloIsoDate(now);
  const startIso = shiftIsoDate(todayIso, -indicator.windowDays);

  try {
    const rows = await fetchJson(buildSgsWindowUrl(indicator.code, startIso, todayIso));
    let normalized = normalizeRows(rows, todayIso);

    if (normalized.length === 0) {
      const latestRows = await fetchJson(buildSgsLatestUrl(indicator.code));
      normalized = normalizeRows(latestRows, todayIso);
    }

    const latest = normalized.at(-1);

    if (!latest) {
      return {
        ...indicator,
        status: 'unavailable',
        reason: 'sem dado oficial até a data atual'
      };
    }

    return {
      ...indicator,
      status: 'available',
      value: latest.value,
      date: latest.date,
      source: `Banco Central do Brasil SGS ${indicator.code}`
    };
  } catch (error) {
    return {
      ...indicator,
      status: 'unavailable',
      reason: error?.name === 'AbortError' ? 'tempo de resposta esgotado' : 'fonte oficial indisponível'
    };
  }
}

async function fetchPtaxDollar(now) {
  const todayIso = getSaoPauloIsoDate(now);

  try {
    for (let daysBack = 0; daysBack <= 7; daysBack += 1) {
      const isoDate = shiftIsoDate(todayIso, -daysBack);
      const payload = await fetchJson(buildPtaxDollarUrl(isoDate));
      const quote = Array.isArray(payload?.value) ? payload.value[0] : null;
      const value = parseBcbNumber(quote?.cotacaoVenda);

      if (value !== null) {
        return {
          key: 'usd_brl_ptax',
          label: 'Dólar PTAX venda',
          status: 'available',
          value,
          unit: 'R$/US$',
          precision: 4,
          date: quote?.dataHoraCotacao || brDateFromIso(isoDate),
          source: 'Banco Central do Brasil PTAX'
        };
      }
    }

    return {
      key: 'usd_brl_ptax',
      label: 'Dólar PTAX venda',
      status: 'unavailable',
      reason: 'sem cotação oficial nos últimos 7 dias',
      source: 'Banco Central do Brasil PTAX'
    };
  } catch (error) {
    return {
      key: 'usd_brl_ptax',
      label: 'Dólar PTAX venda',
      status: 'unavailable',
      reason: error?.name === 'AbortError' ? 'tempo de resposta esgotado' : 'fonte oficial indisponível',
      source: 'Banco Central do Brasil PTAX'
    };
  }
}

async function getIndicators(now) {
  const cacheKey = getSaoPauloIsoDate(now);
  const timestamp = Date.now();

  if (indicatorCache?.key === cacheKey && indicatorCache.expiresAt > timestamp) {
    return indicatorCache.value;
  }

  const indicators = await Promise.all([
    ...SGS_INDICATORS.map((indicator) => fetchSgsIndicator(indicator, now)),
    fetchPtaxDollar(now)
  ]);

  indicatorCache = {
    key: cacheKey,
    expiresAt: timestamp + CACHE_TTL_MS,
    value: indicators
  };

  return indicators;
}

function formatIndicatorLine(indicator) {
  if (indicator.status !== 'available') {
    const source = indicator.source || `Banco Central SGS ${indicator.code}`;
    return `- ${indicator.label}: indisponível agora (${indicator.reason}; fonte: ${source}).`;
  }

  return `- ${indicator.label}: ${formatNumber(indicator.value, indicator.precision)} ${indicator.unit} (referência ${indicator.date}; fonte: ${indicator.source}).`;
}

export async function buildMarketContext(options = {}) {
  const now = asDate(options?.now);
  const indicators = await getIndicators(now);

  const prompt = `
## TEMPO E MERCADO - CONTEXTO ATUAL

- Data e hora atuais: ${formatCurrentDateTime(now)} (${TIME_ZONE}).
- Fonte da data/hora: relógio do servidor no momento da conversa.
- Indicadores oficiais disponíveis:
${indicators.map(formatIndicatorLine).join('\n')}

Use este bloco para responder perguntas sobre hoje, agora, data, hora, Selic, IPCA, CDI, dólar e cenário macroeconômico. Cite a data de referência do indicador quando usar o dado. Se algum indicador estiver indisponível, diga que a fonte oficial não retornou no momento e não chute números.
`.trim();

  return {
    timeZone: TIME_ZONE,
    generatedAt: now.toISOString(),
    currentDateTime: formatCurrentDateTime(now),
    indicators,
    prompt
  };
}
