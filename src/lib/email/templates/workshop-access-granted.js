import { BASIC_ACCESS_PRICE_LABEL, buildMentorshipWhatsappUrl, WORKSHOP_TURMA } from '@/src/lib/commerce/access-offer';
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

export function workshopAccessGrantedTemplate({ profile }) {
  const nome = escapeHtml(firstName(profile?.full_name));
  const turma = escapeHtml(WORKSHOP_TURMA);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zeroapp.szadigital.com.br';
  const whatsappUrl = buildMentorshipWhatsappUrl();

  const content = `
    <p class="greeting">Seu acesso foi liberado, ${nome}.</p>
    <p class="intro">
      Pagamento confirmado. Seu perfil foi atualizado para a turma ${turma}, mantendo o tier DESPERTAR.
      Agora voce pode acessar a Imersao Financas do Zero, ferramentas SHAMAR e comunidade.
    </p>

    <div class="highlight">
      <div class="hl-label">Status do acesso</div>
      <div class="hl-value">${turma}</div>
      <div class="hl-sub">Acesso Basico ${escapeHtml(BASIC_ACCESS_PRICE_LABEL)} confirmado.</div>
    </div>

    <div class="cta-box">
      <p class="cta-text">Entre no ZeroApp e continue sua jornada pelo painel principal.</p>
      <a class="cta-btn" href="${siteUrl}/app">Abrir ZeroApp</a>
    </div>

    <p class="intro">
      Quer falar sobre mentoria ou tirar alguma duvida? Chame nossa equipe pelo WhatsApp:
      <a href="${whatsappUrl}" style="color:#00C853;text-decoration:none;font-weight:800">falar com um atendente</a>.
    </p>

    <div class="assinatura">
      Bom retorno,<br>
      <strong>Jackson Souza</strong><br>
      <span style="font-size:12px;color:#aaa">Mentor · Financas do Zero</span>
    </div>
  `;

  return {
    subject: `${nome}, seu acesso Workshop foi liberado`,
    html: baseTemplate({
      preheader: 'Pagamento confirmado. Seu acesso Workshop ja esta ativo no ZeroApp.',
      content,
      footerText: 'Voce recebe este email porque seu pagamento do Acesso Basico ZeroApp foi confirmado.'
    })
  };
}
