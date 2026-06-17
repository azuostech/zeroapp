import { baseTemplate } from './base-template.js';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function modeLabel(mode) {
  if (mode === 'dupla') return 'SHAMAR em Dupla';
  if (mode === 'tribo') return 'SHAMAR Tribo';
  return 'SHAMAR';
}

export function shamarInviteTemplate({ inviterName, mode, acceptUrl }) {
  const nome = escapeHtml(inviterName || 'alguem especial');
  const modalidade = escapeHtml(modeLabel(mode));
  const url = escapeHtml(acceptUrl);

  const content = `
    <p class="greeting">${nome} convidou voce para construir patrimonio junto</p>
    <p class="intro">
      Existe um tipo de caminhada financeira que fica mais forte quando temos companhia:
      alguem para lembrar do compromisso, celebrar pequenos avancos e manter a constancia viva.
    </p>
    <p class="intro">
      Por isso, ${nome} abriu um convite para voce participar de um <strong>${modalidade}</strong> no ZeroApp.
      Cada pessoa cuida do proprio tabuleiro, dos proprios aportes e dos proprios quadrinhos.
      O grupo aparece apenas para somar forcas e enxergar o patrimonio sendo construido em conjunto.
    </p>

    <div class="highlight">
      <div class="hl-label">Como funciona</div>
      <div class="hl-sub">
        Voce cria sua conta, aguarda a aprovacao no ZeroApp e aceita o convite. Depois disso,
        seu SHAMAR aparece para voce acompanhar sua propria jornada.
      </div>
    </div>

    <div class="cta-box">
      <p class="cta-text">Se esse convite faz sentido para o seu momento, entre e comece com calma. Patrimonio tambem se constroi com bons pactos.</p>
      <a class="cta-btn" href="${url}">Aceitar convite SHAMAR</a>
    </div>

    <div class="assinatura">
      Com respeito pela sua jornada,<br>
      <strong>Jackson Souza</strong><br>
      <span style="font-size:12px;color:#aaa">Mentor · Financas do Zero</span>
    </div>
  `;

  return {
    subject: `${nome} convidou voce para criar patrimonio em conjunto`,
    html: baseTemplate({
      preheader: `Um convite para construir patrimonio com constancia no ${modalidade}.`,
      content
    })
  };
}
