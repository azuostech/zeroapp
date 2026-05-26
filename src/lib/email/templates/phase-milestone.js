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

export function phaseMilestoneTemplate({ profile, faseName, faseEmoji, coinsTotal, recompensas }) {
  const nome = escapeHtml(firstName(profile?.full_name));
  const fase = escapeHtml(faseName);
  const emoji = escapeHtml(faseEmoji);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zeroapp.szadigital.com.br';

  const content = `
    <p class="greeting">${emoji} ${nome}, voce chegou a fase ${fase}!</p>
    <p class="intro">
      Isso nao foi sorte. Foi consistencia. Cada lancamento, cada ganho registrado,
      cada gratidao anotada te trouxe ate aqui.
    </p>

    <div class="highlight">
      <div class="hl-label">ZeroCoins acumulados</div>
      <div class="hl-value">${Number(coinsTotal || 0)} 🪙</div>
      <div class="hl-sub">Fase ${fase} desbloqueada</div>
    </div>

    ${Array.isArray(recompensas) && recompensas.length > 0 ? `
    <div class="section-title">🎁 O que voce desbloqueou</div>
    ${recompensas.map((recompensa) => `<div class="quote-box quote-green">${escapeHtml(recompensa)}</div>`).join('')}
    <div class="divider"></div>
    ` : ''}

    <div class="cta-box">
      <p class="cta-text">Abra o app para ver sua jornada completa e o que vem pela frente.</p>
      <a class="cta-btn" href="${siteUrl}/jornada">Ver minha jornada →</a>
    </div>

    <div class="assinatura">
      Orgulhoso de te ver crescer,<br>
      <strong>Jackson Souza</strong><br>
      <span style="font-size:12px;color:#aaa">Mentor · Financas do Zero</span>
    </div>
  `;

  return {
    subject: `${emoji} Voce chegou a fase ${fase}!`,
    html: baseTemplate({
      preheader: `Parabens! Voce desbloqueou a fase ${fase} com ${Number(coinsTotal || 0)} ZeroCoins.`,
      content
    })
  };
}
