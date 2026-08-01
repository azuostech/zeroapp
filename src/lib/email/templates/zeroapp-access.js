import { baseTemplate } from './base-template.js';

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

export function zeroAppAccessEmail({ name, email, passwordSetupUrl = '' }) {
  const nome = escapeHtml(firstName(name));
  const buyerEmail = escapeHtml(email);
  const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || 'https://zeroapp.tech').replace(/\/+$/, '');
  const loginUrl = `${siteUrl}/`;
  const isNewUser = Boolean(passwordSetupUrl);

  const content = `
    <p class="greeting">${nome}, seu acesso ao ZeroApp está liberado.</p>
    <p class="intro">
      Seu pagamento foi confirmado. Acesse usando o mesmo e-mail informado na compra.
    </p>
    <div class="highlight">
      <div class="hl-label">Seus dados de acesso</div>
      <div class="hl-value">${buyerEmail}</div>
      <div class="hl-sub">${isNewUser ? 'Crie sua senha pessoal no botão abaixo.' : 'Use a senha que você já cadastrou no ZeroApp.'}</div>
    </div>
    <div class="cta-box">
      <p class="cta-text">${isNewUser ? 'O link é pessoal e possui prazo de validade.' : 'Seu acesso existente foi atualizado após a compra.'}</p>
      <a class="cta-btn" href="${escapeHtml(isNewUser ? passwordSetupUrl : loginUrl)}">
        ${isNewUser ? 'DEFINIR MINHA SENHA' : 'ENTRAR NO ZEROAPP'}
      </a>
    </div>
    ${isNewUser ? `<p class="intro">Depois de definir sua senha, entre em <a href="${escapeHtml(loginUrl)}" style="color:#00C853;font-weight:800">${escapeHtml(loginUrl)}</a>.</p>` : ''}
    <p class="intro">Se não lembrar sua senha, use “Esqueci minha senha” na tela de entrada.</p>
    <div class="assinatura">
      Até já,<br>
      <strong>Jackson Souza</strong><br>
      <span style="font-size:12px;color:#aaa">Finanças do Zero</span>
    </div>
  `;

  return {
    subject: `${nome}, seus dados de acesso ao ZeroApp`,
    html: baseTemplate({
      preheader: 'Pagamento confirmado. Seu acesso ao ZeroApp está liberado.',
      content,
      footerText: 'Você recebe este e-mail porque adquiriu o ZeroApp.'
    })
  };
}
