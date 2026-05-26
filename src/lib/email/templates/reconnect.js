import { baseTemplate } from './base-template.js';

function firstName(fullName) {
  return String(fullName || '').trim().split(/\s+/)[0] || 'Mentorado';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function reconnectTemplate({ profile, diasSemAcesso, coinsTotal, faseName, faseEmoji }) {
  const nome = escapeHtml(firstName(profile?.full_name));
  const fase = escapeHtml(faseName);
  const emoji = escapeHtml(faseEmoji);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zeroapp.szadigital.com.br';

  const content = `
    <p class="greeting">Sumiu do radar... 👀</p>
    <p class="intro">
      ${nome}, faz ${Number(diasSemAcesso || 0)} dias que voce nao abre o ZeroApp.
      Nao vim cobrar — vim perguntar: o que aconteceu?
    </p>
    <p class="intro">
      Seu historico esta intacto. Seus ${Number(coinsTotal || 0)} coins ainda estao la.
      Voce ainda e ${emoji} ${fase}.
    </p>
    <p class="intro">
      A consistencia nao precisa ser todos os dias. Precisa ser mais vezes que nao.
      E hoje pode ser um desses dias.
    </p>

    <div class="cta-box">
      <p class="cta-text">Sem pressao. So registra uma coisa hoje.</p>
      <a class="cta-btn" href="${siteUrl}">Voltar para o ZeroApp →</a>
    </div>

    <div class="assinatura">
      Ainda na sua torcida,<br>
      <strong>Jackson Souza</strong><br>
      <span style="font-size:12px;color:#aaa">Mentor · Financas do Zero</span>
    </div>
  `;

  return {
    subject: `${nome}, seu historico esta esperando por voce`,
    html: baseTemplate({
      preheader: `${Number(diasSemAcesso || 0)} dias sem abrir o app. Tudo bem — vamos retomar juntos.`,
      content
    })
  };
}
