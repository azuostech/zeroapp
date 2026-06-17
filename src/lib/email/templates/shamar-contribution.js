import { baseTemplate } from './base-template.js';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  });
}

function formatPercent(value) {
  return `${Math.max(0, Math.min(100, Number(value || 0))).toLocaleString('pt-BR', {
    maximumFractionDigits: 1
  })}%`;
}

function modeLabel(mode) {
  if (mode === 'dupla') return 'SHAMAR em Dupla';
  if (mode === 'tribo') return 'SHAMAR Tribo';
  return 'SHAMAR Individual';
}

function identityLabel(identity) {
  const labels = {
    guardiao: 'Guardiao',
    construtor: 'Construtor',
    cultivador: 'Cultivador',
    multiplicador: 'Multiplicador',
    legado: 'Legado'
  };

  return labels[identity] || labels.guardiao;
}

export function shamarContributionTemplate({
  userName,
  mode,
  amount,
  squaresMarked,
  totalMarkedSquares,
  totalSquares,
  progressPct,
  identity,
  shamarUrl
}) {
  const name = escapeHtml(userName || 'Guardiao');
  const modalidade = escapeHtml(modeLabel(mode));
  const amountLabel = escapeHtml(formatMoney(amount));
  const squaresLabel = Number(squaresMarked || 0);
  const markedLabel = Number(totalMarkedSquares || 0);
  const totalLabel = Number(totalSquares || 0);
  const progressLabel = escapeHtml(formatPercent(progressPct));
  const identityName = escapeHtml(identityLabel(identity));
  const url = escapeHtml(shamarUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://zeroapp.szadigital.com.br/shamar');

  const content = `
    <p class="greeting">Parabens, ${name}. Seu aporte SHAMAR foi registrado.</p>
    <p class="intro">
      Cada aporte e uma decisao concreta: voce protegeu mais uma parte do seu patrimonio
      e marcou presenca na sua jornada de constancia.
    </p>

    <div class="highlight">
      <div class="hl-label">Aporte registrado</div>
      <div class="hl-value">${amountLabel}</div>
      <div class="hl-sub">${modalidade} · ${squaresLabel} quadrinho${squaresLabel === 1 ? '' : 's'} marcado${squaresLabel === 1 ? '' : 's'}</div>
    </div>

    <div class="stats-grid">
      <div class="stat green">
        <div class="stat-n">${progressLabel}</div>
        <div class="stat-l">progresso</div>
      </div>
      <div class="stat gold">
        <div class="stat-n">${markedLabel}/${totalLabel || '-'}</div>
        <div class="stat-l">quadrinhos</div>
      </div>
    </div>

    <div class="quote-box quote-green">
      Sua identidade atual e <strong>${identityName}</strong>. Continue pequeno, constante e intencional:
      patrimonio se constroi com repeticao bem orientada.
    </div>

    <div class="cta-box">
      <p class="cta-text">Volte ao SHAMAR para acompanhar seu tabuleiro, sua evolucao e seus proximos passos.</p>
      <a class="cta-btn" href="${url}">Abrir minha jornada SHAMAR</a>
    </div>

    <div class="assinatura">
      Seguimos juntos na sua construcao,<br>
      <strong>Jackson Souza</strong><br>
      <span style="font-size:12px;color:#aaa">Mentor · Financas do Zero</span>
    </div>
  `;

  return {
    subject: 'Seu aporte SHAMAR foi registrado',
    html: baseTemplate({
      preheader: `Voce registrou ${amountLabel} no ${modalidade}. Continue firme na sua jornada SHAMAR.`,
      content
    })
  };
}
