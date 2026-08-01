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
  const onboardingUrl = `${siteUrl}/obrigadoquiz`;
  const intro = isNewUser
    ? 'Seu pagamento foi confirmado e sua conta no ZeroApp já foi criada automaticamente. Você não precisa fazer outro cadastro.'
    : 'Seu pagamento foi confirmado e o Diagnóstico Completo foi liberado na conta ZeroApp que você já possui.';

  const content = `
    <p class="greeting">${nome}, seu Diagnóstico Completo está liberado.</p>
    <p class="intro">${intro}</p>
    <div class="highlight">
      <div class="hl-label">Produto</div>
      <div class="hl-value">Diagnóstico Completo + ZeroApp</div>
      <div class="hl-sub">Acesso confirmado com segurança.</div>
    </div>
    <div class="cta-box">
      <p class="cta-text">Veja como entrar, registrar ou redefinir sua senha e fazer o diagnóstico sem criar outra conta.</p>
      <a class="cta-btn" href="${escapeHtml(onboardingUrl)}">VER MEUS PRÓXIMOS PASSOS</a>
    </div>
    ${isNewUser && inviteUrl ? `
      <div class="cta-box">
        <p class="cta-text">Como este é seu primeiro acesso, crie também sua senha pessoal:</p>
        <a class="cta-btn" href="${escapeHtml(inviteUrl)}">DEFINIR MINHA SENHA</a>
      </div>
    ` : ''}
    <p class="intro">Você não precisará preencher novamente nome, e-mail ou telefone. Se o link de senha expirar, use “Esqueci minha senha” na tela de entrada.</p>
    <div class="assinatura">
      Até já,<br>
      <strong>Jackson Souza</strong><br>
      <span style="font-size:12px;color:#aaa">Finanças do Zero</span>
    </div>
  `;

  return {
    subject: `${nome}, próximos passos do seu Diagnóstico Completo`,
    html: baseTemplate({
      preheader: 'Pagamento confirmado. Veja como acessar o ZeroApp e fazer seu diagnóstico.',
      content,
      footerText: 'Você recebe este e-mail porque adquiriu o Diagnóstico Completo + ZeroApp.'
    })
  };
}
