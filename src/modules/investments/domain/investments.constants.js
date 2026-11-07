import { formatCompactBRL } from '../../patrimony/domain/patrimony.money';

export const ASSET_CLASSES = {
  tesouro: { label: 'Tesouro Direto', group: 'renda_fixa', variableIncome: false, defaultPricing: 'tesouro_price' },
  renda_fixa_bancaria: { label: 'CDB · LCI · LCA', group: 'renda_fixa', variableIncome: false, defaultPricing: 'cdi_curve' },
  debenture_cri_cra: { label: 'Debênture · CRI · CRA', group: 'renda_fixa', variableIncome: false, defaultPricing: 'cdi_curve' },
  fundo: { label: 'Fundo', group: 'fundos', variableIncome: false, defaultPricing: 'cvm_quota' },
  previdencia: { label: 'Previdência', group: 'fundos', variableIncome: false, defaultPricing: 'cvm_quota' },
  acao: { label: 'Ação', group: 'renda_variavel', variableIncome: true, defaultPricing: 'b3_quote' },
  fii: { label: 'FII', group: 'renda_variavel', variableIncome: true, defaultPricing: 'b3_quote' },
  etf: { label: 'ETF', group: 'renda_variavel', variableIncome: true, defaultPricing: 'b3_quote' },
  bdr: { label: 'BDR', group: 'renda_variavel', variableIncome: true, defaultPricing: 'b3_quote' },
  coe: { label: 'COE', group: 'outros', variableIncome: false, defaultPricing: 'manual' },
  cripto: { label: 'Cripto', group: 'renda_variavel', variableIncome: true, defaultPricing: 'manual' },
  moeda: { label: 'Moeda estrangeira', group: 'outros', variableIncome: false, defaultPricing: 'fx_ptax' },
  outro: { label: 'Outro', group: 'outros', variableIncome: false, defaultPricing: 'manual' }
};
export const FORM_TYPES = [
  { key: 'tesouro', label: 'Tesouro Direto', classes: ['tesouro'] },
  { key: 'bancaria', label: 'CDB · LCI · LCA', classes: ['renda_fixa_bancaria'] },
  { key: 'fundos', label: 'Fundo · Previdência', classes: ['fundo', 'previdencia'] },
  { key: 'bolsa', label: 'Ação · FII · ETF', classes: ['acao', 'fii', 'etf', 'bdr'] },
  { key: 'cripto', label: 'Cripto', classes: ['cripto'] },
  { key: 'outro', label: 'Outro', classes: ['debenture_cri_cra', 'coe', 'moeda', 'outro'] }
];
export const GOAL_KINDS = { reserva_liquidez: 'Reserva de Liquidez', objetivo_prazo: 'Objetivo com prazo', independencia: 'Independência financeira' };
export const GOAL_COLORS = { reserva_liquidez: 'var(--green)', objetivo_prazo: 'var(--gold)', independencia: 'var(--blue)' };
export const RESGATE_REASONS = { objetivo_planejado: 'Usar no objetivo planejado', imprevisto: 'Um imprevisto', quitar_divida: 'Quitar uma dívida', trocar_investimento: 'Trocar por outro investimento', medo_queda: 'Caiu e fiquei com medo de perder mais', outro: 'Outro motivo' };
export const FEELINGS = { tranquilo: 'Tranquilo', ansioso: 'Ansioso', com_medo: 'Com medo', empolgado: 'Empolgado', pressionado: 'Pressionado' };
export const SOURCE_LABELS = { b3: 'B3', tesouro: 'Tesouro', cvm: 'cota CVM', bcb: 'Banco Central', estimado: 'Estimado', manual: 'Manual' };
export const STALE_MANUAL_DAYS = 30;
export const ALERTS_ON_HUB = 3;
export const FGC_LIMIT_DEFAULT = 250000;
export const MIN_CONTRIBUTION_FOR_COINS = 50;
export const INVESTMENT_COINS = { first: 100, month: 20, reserveLevel: 50 };
export const B3_STEPS = [
  'Entre na Área do Investidor da B3 com seu CPF.',
  'Abra a área de posição e escolha a data mais recente.',
  'Baixe o arquivo em Excel (.xlsx) e envie aqui.'
];
export const DEFAULT_POLICY_RULES = [
  { type: 'reserve_months_target', params: { months: 6 }, enabled: true },
  { type: 'variable_income_after_reserve', params: {}, enabled: true },
  { type: 'max_variable_income_pct', params: { pct: 10 }, enabled: true },
  { type: 'reserve_daily_liquidity_low_risk', params: {}, enabled: true },
  { type: 'max_per_institution_fgc', params: { amount: 250000 }, enabled: true }
];
export const POLICY_RULE_LABELS = {
  reserve_months_target: ({ months }) => `Reserva de Liquidez de ${months} meses de custo de vida`,
  variable_income_after_reserve: () => 'Renda variável só depois da Reserva de Liquidez completa',
  max_variable_income_pct: ({ pct }) => `No máximo ${pct}% em renda variável`,
  reserve_daily_liquidity_low_risk: () => 'Reserva só com liquidez diária e baixo risco',
  max_per_institution_fgc: ({ amount }) => `Até ${formatCompactBRL(amount)} por banco (limite do FGC)`
};
export const TEXTS = {
  disclaimer: 'O ZeroApp organiza e mede seus investimentos. Não recomenda ativos: as decisões são suas, com apoio da mentoria.',
  estimated: 'Estimado pela taxa contratada e pelo CDI. Pode diferir um pouco do extrato do banco. Valor bruto, antes do IR.',
  whyLiquidity: 'Não é um dinheiro parado sem propósito. É o que te dá liberdade: atravessar imprevistos, aproveitar oportunidades e deixar o longo prazo trabalhar sem resgatar na hora errada.',
  markToMarket: 'Quando os juros do país sobem, títulos já emitidos valem menos para quem quer comprar hoje. Isso é a marcação a mercado. Se você ficar até o vencimento, recebe exatamente o que contratou. A perda só existe se você vender agora.',
  volatility: 'Oscilar faz parte da renda variável. Vender na queda transforma oscilação em perda.'
};
