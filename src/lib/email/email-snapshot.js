function monthLabel(month, year) {
  const monthNum = Number(month);
  const yearNum = Number(year);

  if (!Number.isInteger(monthNum) || !Number.isInteger(yearNum)) {
    return `${month}/${year}`;
  }

  return new Date(Date.UTC(yearNum, monthNum - 1, 1)).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

function safeNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildMonthlyEmailSnapshot(dados) {
  const financeiro = dados?.financeiro || {};
  const jornada = dados?.jornada || {};
  const coins = dados?.coins || {};

  return {
    month: monthLabel(financeiro.mes, financeiro.ano),
    month_ref: `${String(financeiro.mes || '').padStart(2, '0')}/${financeiro.ano || ''}`,
    saldo_previsto: safeNumber(financeiro.saldoPrevisto),
    saldo_realizado: safeNumber(financeiro.saldoRealizado),
    total_receita_prevista: safeNumber(financeiro.totalReceitaPrevista),
    total_receita_realizada: safeNumber(financeiro.totalReceitaRealizada),
    total_gasto_previsto: safeNumber(financeiro.totalGastoPrevisto),
    total_gasto_realizado: safeNumber(financeiro.totalGastoRealizado),
    blocos: financeiro.blocos || {},
    fase: jornada?.fase?.nome || 'Bombeiro',
    fase_emoji: jornada?.fase?.emoji || '',
    coins: safeNumber(coins.total),
    coins_atual: safeNumber(coins.atual)
  };
}
