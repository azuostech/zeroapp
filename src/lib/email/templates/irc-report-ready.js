import { baseTemplate } from './base-template';
import {
  IRC_NEXT_STEPS_TEXT,
  IRC_ZEROAPP_LESSON_PATH
} from '../../../modules/irc/domain/irc-next-steps';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function ircReportReadyEmail({ name }) {
  const firstName = escapeHtml(String(name || '').trim().split(/\s+/)[0] || 'Você');
  const siteUrl = String(process.env.NEXT_PUBLIC_SITE_URL || 'https://zeroapp.tech').replace(/\/+$/, '');
  const content = `
    <p class="greeting">${firstName}, sua análise está pronta.</p>
    <p class="intro">
      Cruzei tudo o que você revelou ao longo do Diagnóstico Completo. O resultado está anexado em PDF
      e continuará disponível com segurança na sua conta ZeroApp.
    </p>
    <div class="cta-box">
      <p class="cta-text">Seu relatório permanece dentro da sua conta ZeroApp.</p>
      <a class="cta-btn" href="${siteUrl}/diagnostico-completo">VISUALIZAR NO ZEROAPP</a>
    </div>
    <div class="highlight">
      <div class="hl-label">Seu próximo passo</div>
      <div class="hl-value" style="font-size:20px;font-family:inherit">Organize seu mês no ZeroApp</div>
      <div class="hl-sub" style="font-size:13px;line-height:1.6">${escapeHtml(IRC_NEXT_STEPS_TEXT)}</div>
    </div>
    <div class="cta-box">
      <p class="cta-text">Comece pela aula prática que mostra como usar a planilha.</p>
      <a class="cta-btn" href="${siteUrl}${IRC_ZEROAPP_LESSON_PATH}">ASSISTIR À AULA DA PLANILHA</a>
    </div>
    <div class="assinatura">
      Com você nessa jornada,<br>
      <strong>Jackson Souza</strong><br>
      <span style="font-size:12px;color:#aaa">Finanças do Zero</span>
    </div>
  `;
  return {
    subject: `${firstName}, seu Diagnóstico Completo está pronto`,
    html: baseTemplate({
      preheader: 'Seu relatório personalizado está pronto e anexado neste e-mail.',
      content,
      footerText: 'Seu relatório também permanece disponível na sua conta ZeroApp.'
    })
  };
}
