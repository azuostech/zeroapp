export const IDENTITY_LABELS = {
  guardiao: 'Guardiao',
  construtor: 'Construtor',
  cultivador: 'Cultivador',
  multiplicador: 'Multiplicador',
  legado: 'Legado'
};

export const IDENTITY_ICONS = {
  guardiao: '🛡️',
  construtor: '🏗️',
  cultivador: '🌱',
  multiplicador: '💠',
  legado: '🏆'
};

export function formatMoney(value, options = {}) {
  const amount = Number(value || 0);
  const maximumFractionDigits = options.compact ? 1 : 0;

  if (options.compact && Math.abs(amount) >= 1000) {
    return `R$${(amount / 1000).toLocaleString('pt-BR', {
      maximumFractionDigits
    })}k`;
  }

  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits
  });
}

export function formatPercent(value) {
  return `${Math.max(0, Math.min(100, Number(value || 0))).toLocaleString('pt-BR', {
    maximumFractionDigits: 1
  })}%`;
}

export function identityLabel(value) {
  return IDENTITY_LABELS[value] || 'Guardiao';
}

export function identityIcon(value) {
  return IDENTITY_ICONS[value] || IDENTITY_ICONS.guardiao;
}

export function clampPercent(value) {
  return Math.max(0, Math.min(100, Number(value || 0)));
}

export function seasonDay(config) {
  if (!config?.started_at || !config?.ends_at) return { current: 1, total: Number(config?.duration_days || 0) || 1 };

  const start = new Date(`${config.started_at}T00:00:00.000Z`);
  const end = new Date(`${config.ends_at}T00:00:00.000Z`);
  const now = new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { current: 1, total: Number(config?.duration_days || 0) || 1 };
  }

  const total = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  const current = Math.max(1, Math.min(total, Math.ceil((now.getTime() - start.getTime()) / 86400000) + 1));
  return { current, total };
}

export function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}
