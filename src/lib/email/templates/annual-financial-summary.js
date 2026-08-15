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
  return String(value || '').trim().split(/\s+/)[0] || 'Mentorado';
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function percentage(value) {
  return `${Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

export function annualFinancialSummaryTemplate({ summary, clientName }) {
  const name = escapeHtml(firstName(clientName));
  const rows = summary.blocks.map((block) => `
    <tr>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8e3;font-weight:600">${escapeHtml(block.label)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8e3;text-align:right">${money(block.total)}</td>
      <td style="padding:10px 8px;border-bottom:1px solid #e2e8e3;text-align:right;font-weight:700">${percentage(block.revenuePercentage)}</td>
    </tr>`).join('');

  const content = `
    <p class="greeting">Oi, ${name}.</p>
    <p class="intro">Seu resumo financeiro anual de <strong>${escapeHtml(summary.year)}</strong> está pronto. O relatório considera somente valores realizados.</p>
    <div class="stats-grid">
      <div class="stat green"><div class="stat-n">${money(summary.totals.revenue)}</div><div class="stat-l">Receita realizada</div></div>
      <div class="stat rose"><div class="stat-n">${money(summary.totals.expenses)}</div><div class="stat-l">Saídas realizadas</div></div>
      <div class="stat green"><div class="stat-n">${money(summary.totals.balance)}</div><div class="stat-l">Saldo realizado</div></div>
    </div>
    <div class="section-title">Realizado por bloco</div>
    <table role="presentation" style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:22px">
      <thead><tr style="background:#176b32;color:#fff"><th style="padding:10px 8px;text-align:left">Bloco</th><th style="padding:10px 8px;text-align:right">Total anual</th><th style="padding:10px 8px;text-align:right">% receita</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="highlight"><div class="hl-label">Arquivos anexos</div><div class="hl-sub">O PDF e a planilha Excel completos acompanham este e-mail.</div></div>
    <div class="assinatura">Com consistência,<br><strong>Jackson Souza</strong><br><span style="font-size:12px;color:#aaa">Mentor · Finanças do Zero</span></div>`;

  return {
    subject: `Resumo financeiro anual ${summary.year} - Finanças do Zero`,
    html: baseTemplate({ preheader: `Resumo anual ${summary.year}: receita ${money(summary.totals.revenue)} e saldo ${money(summary.totals.balance)}`, content })
  };
}
