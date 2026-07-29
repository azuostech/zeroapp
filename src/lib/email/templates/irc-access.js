import { baseTemplate } from './base-template';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function firstName(value) {
  return String(value || '').trim().split(/\s+/)[0] || 'Você';
}

export function ircAccessEmail({ name, inviteUrl, isNewUser }) {
  const nome = escapeHtml(firstName(name));
  const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || 'https://zeroapp.tech').replace(/\/+$/, '');
  const targetUrl = inviteUrl || `${siteUrl}/diagnostico-completo`;
  const button = isNewUser ? 'DEFINIR MINHA SENHA' : 'ACESSAR MEU DIAGNÓSTICO';
  const intro = isNewUser
    ? 'Seu pagamento foi confirmado e sua conta no ZeroApp foi criada. Defina sua senha para começar.'
    : 'Seu pagamento foi confirmado e o Diagnóstico Completo foi liberado na sua conta ZeroApp.';

  const content = `
    <p class="greeting">${nome}, seu Diagnóstico Completo está liberado.</p>
    <p class="intro">${intro}</p>
    <div class="highlight">
      <div class="hl-label">Produto</div>
      <div class="hl-value">Diagnóstico Completo + ZeroApp</div>
      <div class="hl-sub">Acesso confirmado com segurança.</div>
    </div>
    <div class="cta-box">
      <p class="cta-text">Você não precisará preencher novamente nome, e-mail ou telefone.</p>
      <a class="cta-btn" href="${escapeHtml(targetUrl)}">${button}</a>
    </div>
    <p class="intro">Se o link de definição de senha expirar, use “Esqueci minha senha” na tela de login.</p>
    <div class="assinatura">
      Até já,<br>
      <strong>Jackson Souza</strong><br>
      <span style="font-size:12px;color:#aaa">Finanças do Zero</span>
    </div>
  `;

  return {
    subject: `${nome}, seu Diagnóstico Completo foi liberado`,
    html: baseTemplate({
      preheader: 'Pagamento confirmado. Acesse seu Diagnóstico Completo no ZeroApp.',
      content,
      footerText: 'Você recebe este e-mail porque adquiriu o Diagnóstico Completo + ZeroApp.'
    })
  };
}
