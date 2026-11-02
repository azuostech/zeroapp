export const TODAY = '2026-11-01';
export const DAILY_BANK = 'Nubank';
export const GOALS = [
  { id: 'g-res', kind: 'reserva_liquidez', name: 'Reserva de Liquidez' },
  { id: 'g-via', kind: 'objetivo_prazo', name: 'Viagem em família', target_amount: 8000, target_date: '2027-12-01' },
  { id: 'g-ind', kind: 'independencia', name: 'Independência financeira' }
];
export const POSITIONS = [
  { id: 'p1', goal_id: 'g-res', asset_class: 'renda_fixa_bancaria', name: 'CDB Liquidez Diária', institution: 'Nubank', indexer: 'cdi', rate: 100, pricing_method: 'cdi_curve', liquidity_days: 0, guarantee: 'fgc', risk_flags: [], current_value: 4230, invested_amount: 4100, current_value_source: 'estimado', status: 'ativa' },
  { id: 'p2', goal_id: 'g-res', asset_class: 'tesouro', name: 'Tesouro Selic 2029', institution: 'XP', indexer: 'selic', pricing_method: 'tesouro_price', liquidity_days: 1, guarantee: 'tesouro', risk_flags: [], current_value: 1520, invested_amount: 1480, current_value_source: 'tesouro', status: 'ativa' },
  { id: 'p3', goal_id: 'g-via', asset_class: 'renda_fixa_bancaria', name: 'CDB Prefixado 12,8% a.a.', institution: 'Banco Inter', indexer: 'pre', rate: 12.8, pricing_method: 'pre_curve', maturity_date: '2028-03-15', guarantee: 'fgc', risk_flags: [], current_value: 2100, invested_amount: 2000, current_value_source: 'estimado', status: 'ativa' },
  { id: 'p4', goal_id: 'g-ind', asset_class: 'previdencia', name: 'Previdência PGBL Renda Fixa', institution: 'XP', pricing_method: 'cvm_quota', guarantee: 'nenhuma', risk_flags: [], current_value: 6380, invested_amount: 6000, current_value_source: 'cvm', status: 'ativa' },
  { id: 'p5', goal_id: 'g-ind', asset_class: 'tesouro', name: 'Tesouro IPCA+ 2035', institution: 'XP', indexer: 'ipca', rate: 7.10, pricing_method: 'tesouro_price', maturity_date: '2035-05-15', liquidity_days: 1, guarantee: 'tesouro', risk_flags: [], current_value: 1050, curve_value: 1135, invested_amount: 1100, current_value_source: 'tesouro', status: 'ativa' },
  { id: 'p6', goal_id: 'g-ind', asset_class: 'fii', name: 'MXRF11', ticker: 'MXRF11', institution: 'XP', quantity: 120, pricing_method: 'b3_quote', liquidity_days: 2, guarantee: 'nenhuma', risk_flags: [], current_value: 1152, invested_amount: 1182, current_value_source: 'b3', status: 'ativa' }
];
