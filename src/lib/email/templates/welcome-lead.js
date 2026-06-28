import { BASIC_ACCESS_CHECKOUT_URL, BASIC_ACCESS_PRICE_LABEL, buildMentorshipWhatsappUrl } from '@/src/lib/commerce/access-offer';
import { baseTemplate } from './base-template.js';

function firstName(fullName) {
  return String(fullName || '').trim().split(/\s+/)[0] || 'Voce';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function welcomeLeadTemplate({ profile }) {
  const nome = escapeHtml(firstName(profile?.full_name));
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zeroapp.szadigital.com.br';
  const whatsappUrl = buildMentorshipWhatsappUrl();

  const content = `
    <p class="greeting">Bem-vindo ao ZeroApp, ${nome}.</p>
    <p class="intro">
      O ZeroApp e o seu ecossistema para organizar as financas, estudar conteudos livres e dar os primeiros passos
      no metodo Financas do Zero.
    </p>
    <p class="intro">
      Seu acesso inicial ja permite entrar no painel financeiro e assistir aos conteudos gratuitos da area educacional.
      Os ambientes de alunos, como comunidade e ferramentas SHAMAR, ficam liberados quando voce entra para uma turma ativa.
    </p>

    <div class="highlight">
      <div class="hl-label">Acesso Basico</div>
      <div class="hl-value">${escapeHtml(BASIC_ACCESS_PRICE_LABEL)}</div>
      <div class="hl-sub">Pagamento unico para liberar Imersao Financas do Zero, SHAMAR e comunidade.</div>
    </div>

    <div class="cta-box">
      <p class="cta-text">Quando quiser dar o proximo passo, voce pode liberar o Acesso Basico direto pela plataforma.</p>
      <a class="cta-btn" href="${BASIC_ACCESS_CHECKOUT_URL}">Liberar acesso basico</a>
    </div>

    <p class="intro">
      Se quiser falar sobre mentoria, nossa equipe tambem te atende pelo WhatsApp:
      <a href="${whatsappUrl}" style="color:#00C853;text-decoration:none;font-weight:800">falar com um atendente</a>.
    </p>

    <div class="assinatura">
      Te vejo dentro do app,<br>
      <strong>Jackson Souza</strong><br>
      <span style="font-size:12px;color:#aaa">Mentor · Financas do Zero</span>
    </div>
  `;

  return {
    subject: `${nome}, seja bem-vindo ao ZeroApp`,
    html: baseTemplate({
      preheader: 'Seu acesso inicial ao ZeroApp foi criado. Comece pelas financas e conteudos livres.',
      content,
      footerText: 'Voce recebe este email porque criou uma conta no ZeroApp.'
    })
  };
}
