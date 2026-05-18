export const SIMPLE_BLOCK_KEYS = ['receitas', 'pagar-primeiro', 'doar', 'investimentos', 'desfrute'];

export function createFinanceItem(nome = '', valor = '0') {
  const normalized = normalizeMoneyString(valor, '0', { keepEmpty: false });
  return {
    nome: String(nome || ''),
    valor_previsto: normalized,
    valor_realizado: '0',
    realized: false,
    valor: normalized
  };
}

export function createContaSubcat(nome = '', valor = '0') {
  const normalized = normalizeMoneyString(valor, '0', { keepEmpty: false });
  return {
    nome: String(nome || ''),
    valor_previsto: normalized,
    valor_realizado: '0',
    realized: false,
    valor: normalized
  };
}

function normalizeMoneyString(value, fallback = '0', { keepEmpty = true } = {}) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return fallback;
    return String(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return keepEmpty ? '' : fallback;
    return trimmed;
  }

  return fallback;
}

function toRealizedBoolean(value) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value || '').trim().toLowerCase();
  return ['true', 't', '1', 'yes', 'y', 'sim'].includes(normalized);
}

function normalizeFinanceItem(input) {
  const item = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const legacyValor = normalizeMoneyString(item.valor ?? '0', '0', { keepEmpty: true });
  const basePrevisto = normalizeMoneyString(item.valor_previsto ?? legacyValor ?? '0', '0', { keepEmpty: true });
  const hasLegacyOverride =
    typeof item.valor !== 'undefined' &&
    typeof item.valor_previsto !== 'undefined' &&
    String(item.valor_previsto) !== String(item.valor) &&
    !toRealizedBoolean(item.realized);

  const valorPrevisto = hasLegacyOverride ? legacyValor : basePrevisto;
  const valorRealizado = normalizeMoneyString(item.valor_realizado ?? '0', '0', { keepEmpty: true });

  return {
    ...item,
    nome: String(item.nome || ''),
    valor_previsto: valorPrevisto,
    valor_realizado: valorRealizado,
    realized: toRealizedBoolean(item.realized),
    valor: normalizeMoneyString(item.valor ?? valorPrevisto, '0', { keepEmpty: true })
  };
}

function normalizeContas(value) {
  if (!Array.isArray(value)) return [];

  return value.map((group) => {
    const safeGroup = group && typeof group === 'object' && !Array.isArray(group) ? group : {};
    const subcats = Array.isArray(safeGroup.subcats) ? safeGroup.subcats : [];

    return {
      ...safeGroup,
      nome: String(safeGroup.nome || ''),
      subcats: subcats.map((subcat) => normalizeFinanceItem(subcat))
    };
  });
}

export const DEFAULT_FINANCIAL_DATA = {
  receitas: [
    createFinanceItem('Salário 1'),
    createFinanceItem('Salário 2'),
    createFinanceItem('Aluguel'),
    createFinanceItem('Aposentadoria')
  ],
  'pagar-primeiro': [
    createFinanceItem('Lucro Primeiro'),
    createFinanceItem('Reserva de Liquidez'),
    createFinanceItem('Outros pagamentos')
  ],
  doar: [createFinanceItem('Dízimos'), createFinanceItem('Ofertas'), createFinanceItem('Outras doações')],
  contas: [
    {
      nome: 'Habitação',
      subcats: [
        createContaSubcat('Aluguel'),
        createContaSubcat('Condomínio'),
        createContaSubcat('Energia'),
        createContaSubcat('Água')
      ]
    },
    {
      nome: 'Transporte',
      subcats: [createContaSubcat('Combustível'), createContaSubcat('Seguro auto'), createContaSubcat('Estacionamento')]
    },
    {
      nome: 'Saúde',
      subcats: [createContaSubcat('Plano de saúde'), createContaSubcat('Medicamentos'), createContaSubcat('Consultas')]
    },
    {
      nome: 'Educação',
      subcats: [createContaSubcat('Mensalidade'), createContaSubcat('Cursos'), createContaSubcat('Material')]
    },
    {
      nome: 'Alimentação',
      subcats: [createContaSubcat('Supermercado'), createContaSubcat('Restaurante')]
    },
    {
      nome: 'Cuidados Pessoais',
      subcats: [createContaSubcat('Salão'), createContaSubcat('Academia')]
    },
    {
      nome: 'Impostos',
      subcats: [createContaSubcat('IPTU'), createContaSubcat('IPVA')]
    },
    {
      nome: 'Bancos',
      subcats: [createContaSubcat('Tarifas'), createContaSubcat('Anuidades')]
    },
    {
      nome: 'Cartões',
      subcats: [createContaSubcat('Cartão 1'), createContaSubcat('Cartão 2')]
    }
  ],
  investimentos: [createFinanceItem('Carteira de Investimentos'), createFinanceItem('Consórcio'), createFinanceItem('Cotas')],
  desfrute: [createFinanceItem('Viagem'), createFinanceItem('Jantar'), createFinanceItem('Lazer')]
};

export function cloneDefaultFinancialData() {
  return JSON.parse(JSON.stringify(DEFAULT_FINANCIAL_DATA));
}

export function normalizeFinancialData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return cloneDefaultFinancialData();
  }

  const normalized = {
    ...cloneDefaultFinancialData(),
    ...data
  };

  SIMPLE_BLOCK_KEYS.forEach((blockKey) => {
    const list = Array.isArray(data[blockKey]) ? data[blockKey] : [];
    normalized[blockKey] = list.map((item) => normalizeFinanceItem(item));
  });

  normalized.contas = normalizeContas(data.contas);
  return normalized;
}

export function isNumericValueString(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'string') return false;

  const normalized = value
    .replace(/\s/g, '')
    .replace(/R\$/gi, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');

  if (normalized === '') return true;

  return Number.isFinite(Number(normalized));
}
