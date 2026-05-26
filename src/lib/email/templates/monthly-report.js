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

function fmtMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function monthLabel(month, year) {
  const monthNum = Number(month);
  const yearNum = Number(year);

  if (!Number.isInteger(monthNum) || !Number.isInteger(yearNum)) {
    return `${month}/${year}`;
  }

  return new Date(Date.UTC(yearNum, monthNum - 1, 1)).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

export function monthlyReportTemplate(dados) {
  const { profile, coins, financeiro, praticas, jornada } = dados;
  const nome = escapeHtml(firstName(profile?.full_name));
  const nomeMes = monthLabel(financeiro?.mes, financeiro?.ano);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://zeroapp.szadigital.com.br';

  const content = `
    <p class="greeting">Oi, ${nome}. ${nomeMes} foi seu. 🪙</p>
    <p class="intro">
      Todo mes eu olho para os seus numeros — nao para te julgar, mas para te mostrar
      o que voce nao estava vendo. E ${nomeMes} tem coisa boa pra contar.
    </p>

    <div class="highlight">
      <div class="hl-label">Seus ZeroCoins totais</div>
      <div class="hl-value">${Number(coins?.total || 0)} 🪙</div>
      <div class="hl-sub">Fase atual: ${jornada?.fase?.emoji || ''} ${jornada?.fase?.nome || 'Bombeiro'}${Number(jornada?.coinsParaProxima || 0) > 0 ? ` · ${Number(jornada?.coinsParaProxima || 0)} coins para ${jornada?.proximaFase?.nome || 'proxima fase'}` : ' · Fase maxima!'}</div>
    </div>

    <div class="stats-grid">
      <div class="stat green">
        <div class="stat-n">${Number(praticas?.gainsMes || 0)}</div>
        <div class="stat-l">Ganhos registrados</div>
      </div>
      <div class="stat rose">
        <div class="stat-n">${Number(praticas?.gratitudeMes || 0)}</div>
        <div class="stat-l">Gratidoes registradas</div>
      </div>
      <div class="stat green">
        <div class="stat-n">${fmtMoney(financeiro?.totalReceitaRealizada || 0)}</div>
        <div class="stat-l">Receitas realizadas</div>
      </div>
      <div class="stat gold">
        <div class="stat-n">${fmtMoney(financeiro?.saldoRealizado || 0)}</div>
        <div class="stat-l">Saldo realizado</div>
      </div>
    </div>

    <div class="divider"></div>

    ${praticas?.maiorGanho ? `
    <div class="section-title">⚡ Seu maior ganho do mes</div>
    <div class="quote-box quote-green">${escapeHtml(praticas.maiorGanho.descricao || '')}</div>
    <p style="font-size:13px;color:#888;line-height:1.7;margin-bottom:20px">
      Esse ganho nao e sobre dinheiro. E sobre decisao. Voce parou de evitar e foi encarar.
    </p>
    ` : ''}

    ${praticas?.maiorGratidao ? `
    <div class="section-title">🌸 Sua gratidao mais recente</div>
    <div class="quote-box quote-rose">${escapeHtml(praticas.maiorGratidao.descricao || '')}</div>
    <div class="divider"></div>
    ` : ''}

    ${praticas?.ultimaIdentidade ? `
    <div class="section-title">💎 Sua identidade hoje</div>
    <div class="quote-box quote-purple">Eu sou ${escapeHtml(praticas.ultimaIdentidade.declaracao || '')}</div>
    <p style="font-size:13px;color:#888;line-height:1.7;margin-bottom:20px">
      Guarda essa frase. Ela vai te salvar em mais de um momento dificil nos proximos meses.
    </p>
    <div class="divider"></div>
    ` : ''}

    <div class="cta-box">
      <p class="cta-text">O proximo mes comeca agora. Abra o app e registre o primeiro lancamento.</p>
      <a class="cta-btn" href="${siteUrl}">Abrir o ZeroApp →</a>
    </div>

    <div class="assinatura">
      Com consistencia,<br>
      <strong>Jackson Souza</strong><br>
      <span style="font-size:12px;color:#aaa">Mentor · Financas do Zero</span>
    </div>
  `;

  return {
    subject: `Seu resumo de ${nomeMes} chegou 🪙`,
    html: baseTemplate({
      preheader: `${Number(coins?.total || 0)} ZeroCoins · Fase ${jornada?.fase?.nome || 'Bombeiro'} · ${Number(praticas?.gainsMes || 0)} ganhos em ${nomeMes}`,
      content
    })
  };
}
