'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { toast as hotToast } from 'react-hot-toast';
import { getBrowserSupabase } from '@/src/lib/supabase/browser';
import { CoinsDisplay } from '@/components/gamification/CoinsDisplay';
import { TierDisplay } from '@/components/gamification/TierDisplay';
import BottomNav from '@/components/layout/BottomNav';
import {
  SIMPLE_BLOCK_KEYS,
  cloneDefaultFinancialData,
  createContaSubcat,
  createFinanceItem,
  normalizeFinancialData
} from '@/src/modules/finance/domain/defaults';

const THEME_KEY = 'zeroapp-theme';
const ALLOWED_MAVF_TIERS = ['MOVIMENTO', 'ACELERACAO', 'AUTOGOVERNO'];

const BLOCOS_SAIDA = ['pagar-primeiro', 'doar', 'contas', 'investimentos', 'desfrute'];

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pm(str) {
  if (!str) return 0;
  return parseFloat(str.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.')) || 0;
}

const fr = (n) =>
  'R$ ' +
  Number(n || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

function fc(n) {
  const value = Number(n || 0);
  if (value === 0) return 'R$ 0';
  if (value >= 1000) {
    return (
      'R$ ' +
      (value / 1000).toLocaleString('pt-BR', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
      }) +
      'k'
    );
  }
  return (
    'R$ ' +
    value.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    })
  );
}

async function apiRequest(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    cache: 'no-store'
  });

  const text = await res.text();
  const payload = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(payload?.error || 'Erro na requisição');
  }

  return payload;
}

function withUserQuery(path, userId) {
  if (!userId) return path;
  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}user_id=${encodeURIComponent(userId)}`;
}

function withUserBody(body, userId) {
  if (!userId) return body;
  return { ...(body || {}), user_id: userId };
}

export default function FinanceAppPage({ adminViewUserId = null }) {
  const [theme, setTheme] = useState('light');
  const [canAccessMavf, setCanAccessMavf] = useState(false);
  const [hasActiveMavfSession, setHasActiveMavfSession] = useState(false);
  const [impersonationLabel, setImpersonationLabel] = useState('');
  const [workshopCode, setWorkshopCode] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [tierDisplayKey, setTierDisplayKey] = useState(0);
  const [headerFaseProgress, setHeaderFaseProgress] = useState(null);
  const adminMode = Boolean(adminViewUserId);

  const handleMavfClick = (event) => {
    if (canAccessMavf) return;
    event.preventDefault();
    window.alert('O MAVF e exclusivo para membros da Mentoria em Grupo (tier MOVIMENTO ou superior).');
  };

  useEffect(() => {
    if (adminMode) {
      setHeaderFaseProgress(null);
      return undefined;
    }

    let mounted = true;

    const loadFaseProgress = async () => {
      try {
        const response = await fetch('/api/coins/history?limit=1', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json().catch(() => ({}));
        const fase = payload?.fase_atual;
        const proxima = payload?.proxima_fase;

        if (!mounted || !fase) return;

        setHeaderFaseProgress({
          emoji: fase.emoji || '🔥',
          progressoPct: Number(fase.progresso_pct || 0),
          coinsParaProxima: Number(fase.coins_para_proxima || 0),
          nextName: proxima?.nome || null
        });
      } catch (_) {
        // no-op
      }
    };

    loadFaseProgress();
    const onCoinsUpdated = () => loadFaseProgress();
    window.addEventListener('zero:coins-updated', onCoinsUpdated);

    return () => {
      mounted = false;
      window.removeEventListener('zero:coins-updated', onCoinsUpdated);
    };
  }, [adminMode]);

  const handleRedeemWorkshop = async (event) => {
    event.preventDefault();
    if (adminMode || redeemLoading) return;

    const code = workshopCode.trim().toUpperCase();
    if (!code) {
      hotToast.error('Digite um código para resgatar');
      return;
    }

    setRedeemLoading(true);
    try {
      const response = await fetch('/api/workshop/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const mapError = {
          code_not_found: 'Código não encontrado',
          code_already_used: 'Este código já foi utilizado',
          code_expired: 'Este código expirou',
          tier_already_unlocked: 'Você já tem acesso MOVIMENTO ou superior'
        };
        hotToast.error(mapError[payload?.error] || 'Não foi possível resgatar o código');
        return;
      }

      setWorkshopCode('');
      setCanAccessMavf(true);
      setTierDisplayKey((prev) => prev + 1);
      hotToast.success('🎉 Código resgatado! +500 🪙 e tier MOVIMENTO desbloqueado');

      const balance = payload?.balance;
      if (balance && Number.isFinite(Number(balance.coins)) && Number.isFinite(Number(balance.coins_total))) {
        window.dispatchEvent(
          new CustomEvent('zero:coins-updated', {
            detail: {
              sourceId: 'workshop-redeem',
              payload: {
                coins: Number(balance.coins),
                coins_total: Number(balance.coins_total),
                phase: String(balance.phase || 'BOMBEIRO'),
                amount_awarded: 500,
                triggerAnimation: true
              }
            }
          })
        );
      }
    } catch (_) {
      hotToast.error('Erro ao resgatar código');
    } finally {
      setRedeemLoading(false);
    }
  };

  useEffect(() => {
    let nextTheme = 'light';
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') nextTheme = saved;
    } catch (_) {
      // no-op
    }
    setTheme(nextTheme);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (_) {
      // no-op
    }
  }, [theme]);

  useEffect(() => {
    let dados = {};
    let currentUser = null;
    let saveTimer = null;
    let mounted = true;
    let editingTarget = null;
    const targetUserId = adminMode ? adminViewUserId : null;
    const targetFinancePath = (path) => withUserQuery(path, targetUserId);
    const targetPayload = (body) => withUserBody(body, targetUserId);

    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    const toast = (msg) => {
      const t = document.getElementById('toast');
      if (!t) return;
      t.textContent = msg;
      t.classList.add('show');
      setTimeout(() => t.classList.remove('show'), 2200);
    };

    const getCurrentMonthYear = () => {
      const month = document.getElementById('mesSelect')?.value;
      const year = document.getElementById('anoSelect')?.value;
      if (!month || !year) return null;
      return { month, year };
    };

    const emitCoinsAwardFeedback = (payload) => {
      const awards = Array.isArray(payload?.coins_awarded) ? payload.coins_awarded : [];
      if (!awards.length) return;

      let totalAwarded = 0;
      awards.forEach((award) => {
        const amount = Number(award?.amount || 0);
        if (amount <= 0) return;
        totalAwarded += amount;
        toast(`+${amount} 🪙 ${award?.description || 'Recompensa'}`);
      });

      const balance = payload?.coins_balance;
      if (!balance || totalAwarded <= 0) return;

      if (Number.isNaN(Number(balance.coins)) || Number.isNaN(Number(balance.coins_total))) {
        return;
      }

      try {
        window.dispatchEvent(
          new CustomEvent('zero:coins-updated', {
            detail: {
              sourceId: 'finance-app-page',
              payload: {
                coins: Number(balance.coins),
                coins_total: Number(balance.coins_total),
                phase: String(balance.phase || 'BOMBEIRO'),
                amount_awarded: totalAwarded,
                triggerAnimation: true
              }
            }
          })
        );
      } catch (_) {
        // no-op
      }
    };

    const persistToggleRealized = async ({ bloco, realized, itemIndex = null, grupoIndex = null, subcatIndex = null, valorRealizado = '0' }) => {
      const period = getCurrentMonthYear();
      if (!period) {
        throw new Error('invalid_period');
      }

      const payload = {
        month: period.month,
        year: period.year,
        action: 'toggle_realized',
        bloco,
        realized: Boolean(realized),
        valor_realizado: valorRealizado,
        data: dados
      };

      if (bloco === 'contas') {
        payload.grupo_index = grupoIndex;
        payload.subcat_index = subcatIndex;
      } else {
        payload.item_index = itemIndex;
      }

      return apiRequest('/api/finance/month', {
        method: 'POST',
        body: JSON.stringify(targetPayload(payload))
      });
    };

    const replicarEstrutura = async (operation, successMsg) => {
      const period = getCurrentMonthYear();
      if (!period) return;

      try {
        await apiRequest('/api/finance/structure', {
          method: 'POST',
          body: JSON.stringify(
            targetPayload({
              month: period.month,
              year: period.year,
              operation
            })
          )
        });
        if (successMsg) toast(successMsg);
      } catch (_) {
        toast('Não foi possível replicar para os demais meses');
      }
    };

    const perguntarReplicarInclusao = () =>
      window.confirm(
        'Deseja replicar este campo para os demais meses?\n\nOK = replicar para os demais meses\nCancelar = somente neste mês'
      );

    const perguntarReplicarExclusao = () =>
      window.confirm(
        'Deseja excluir este campo dos demais meses também?\n\nOK = excluir de todos os meses\nCancelar = excluir somente neste mês'
      );

    const numOnly = (event) => {
      if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Enter', '.'].includes(event.key) || /^[0-9,]$/.test(event.key)) {
        return;
      }
      event.preventDefault();
    };

    const salvarNuvem = async () => {
      try {
        const mes = document.getElementById('mesSelect')?.value;
        const ano = document.getElementById('anoSelect')?.value;

        await apiRequest('/api/finance/month', {
          method: 'POST',
          body: JSON.stringify(
            targetPayload({
              month: mes,
              year: ano,
              data: dados
            })
          )
        });

        const dot = document.getElementById('save-dot');
        const lbl = document.getElementById('save-label');
        dot?.classList.remove('saving');
        if (!lbl) return;
        lbl.textContent = '✓ Salvo';
        setTimeout(() => {
          if (lbl.textContent === '✓ Salvo') lbl.textContent = '';
        }, 2500);
      } catch (_) {
        const dot = document.getElementById('save-dot');
        const lbl = document.getElementById('save-label');
        dot?.classList.remove('saving');
        if (lbl) lbl.textContent = '⚠ Erro ao salvar';
      }
    };

    const agendarSalvar = () => {
      const dot = document.getElementById('save-dot');
      const lbl = document.getElementById('save-label');
      dot?.classList.add('saving');
      if (lbl) lbl.textContent = 'Salvando...';
      clearTimeout(saveTimer);
      saveTimer = setTimeout(salvarNuvem, 1500);
    };

    const getPrevisto = (item) => pm(item?.valor_previsto ?? item?.valor ?? '0');
    const getRealizadoBase = (item) => pm(item?.valor_realizado ?? item?.valor_previsto ?? item?.valor ?? '0');

    const ensureItemShape = (item) => {
      const safeItem = item && typeof item === 'object' ? item : createFinanceItem('');
      const previsto = typeof safeItem.valor_previsto === 'string' ? safeItem.valor_previsto : String(safeItem.valor ?? '0');

      safeItem.valor_previsto = previsto;
      safeItem.valor = typeof safeItem.valor === 'string' ? safeItem.valor : previsto;
      safeItem.valor_realizado = typeof safeItem.valor_realizado === 'string' ? safeItem.valor_realizado : '0';
      safeItem.realized = Boolean(safeItem.realized);

      return safeItem;
    };

    const ensureDadosShape = () => {
      dados = normalizeFinancialData(dados);
    };

    const resumoStatus = (previsto, realizado, totalItens, realizados) => {
      if (!totalItens) return 'Não iniciado';
      if (previsto === 0 && realizado === 0) return `${Math.max(0, totalItens - realizados)} pendentes`;
      if (previsto > 0 && realizado > previsto) return `⚠ Acima +${Math.round((realizado / previsto) * 100) - 100}%`;
      if (realizados === totalItens) return 'Completo ✓';
      return `${Math.max(0, totalItens - realizados)} pendentes`;
    };

    const resumoValor = (previsto, realizado) => `${fc(realizado)} / ${fc(previsto)}`;
    const setSaldoResumo = (baseId, previsto, realizado) => {
      setText(baseId, fc(realizado));
      setText(`${baseId}-prev`, fc(previsto));
    };
    const rowAmountLabel = (item) => {
      if (!item) return 'R$ 0,00';
      return fr(item.realized ? getRealizadoBase(item) : getPrevisto(item));
    };

    const getEditingItem = () => {
      if (!editingTarget) return null;
      if (editingTarget.kind === 'simple') return dados?.[editingTarget.bloco]?.[editingTarget.index] || null;
      if (editingTarget.kind === 'subcat') return dados?.contas?.[editingTarget.gi]?.subcats?.[editingTarget.si] || null;
      return null;
    };

    const openEditor = (target) => {
      editingTarget = target;
      const item = getEditingItem();
      if (!item) {
        editingTarget = null;
        return;
      }
      ensureItemShape(item);

      const overlay = document.getElementById('value-sheet-overlay');
      const title = document.getElementById('sheet-item-title');
      const previstoInput = document.getElementById('sheet-previsto-input');
      const realizadoInput = document.getElementById('sheet-realizado-input');
      const status = document.getElementById('sheet-item-status');

      if (!overlay || !title || !previstoInput || !realizadoInput || !status) return;

      title.textContent = item.nome || 'Item';
      status.textContent = item.realized ? 'Status atual: realizado' : 'Status atual: pendente';
      previstoInput.value = item.valor_previsto ?? item.valor ?? '';
      realizadoInput.value = item.valor_realizado ?? '';
      overlay.classList.add('show');
      setTimeout(() => previstoInput.focus(), 0);
    };

    const closeEditor = () => {
      editingTarget = null;
      document.getElementById('value-sheet-overlay')?.classList.remove('show');
    };

    const saveEditor = () => {
      const item = getEditingItem();
      if (!item) {
        closeEditor();
        return;
      }

      const previstoInput = document.getElementById('sheet-previsto-input');
      const realizadoInput = document.getElementById('sheet-realizado-input');
      if (!previstoInput || !realizadoInput) return;

      ensureItemShape(item);
      item.valor_previsto = previstoInput.value;
      item.valor = previstoInput.value;
      item.valor_realizado = realizadoInput.value;

      if (item.realized && pm(item.valor_realizado) <= 0) {
        item.valor_realizado = item.valor_previsto ?? item.valor ?? '0';
      }

      if (editingTarget?.kind === 'simple') {
        renderBlocoSimples(editingTarget.bloco);
      } else if (editingTarget?.kind === 'subcat') {
        renderSubcats(editingTarget.gi);
      }

      calcularTotais();
      agendarSalvar();
      closeEditor();
    };

    const calcularTotais = () => {
      ensureDadosShape();

      const t = {};
      SIMPLE_BLOCK_KEYS.forEach((bloco) => {
        const itens = (dados[bloco] || []).map(ensureItemShape);
        const previsto = itens.reduce((acc, item) => acc + getPrevisto(item), 0);
        const realizado = itens.filter((item) => item.realized).reduce((acc, item) => acc + getRealizadoBase(item), 0);
        const realizados = itens.filter((item) => item.realized).length;

        t[bloco] = {
          previsto,
          realizado,
          totalItens: itens.length,
          realizados,
          status: resumoStatus(previsto, realizado, itens.length, realizados)
        };
      });

      const contasSubcats = (dados.contas || []).flatMap((grupo) => (Array.isArray(grupo?.subcats) ? grupo.subcats : []).map(ensureItemShape));
      const contasPrevisto = contasSubcats.reduce((acc, item) => acc + getPrevisto(item), 0);
      const contasRealizado = contasSubcats.filter((item) => item.realized).reduce((acc, item) => acc + getRealizadoBase(item), 0);
      const contasRealizados = contasSubcats.filter((item) => item.realized).length;

      t.contas = {
        previsto: contasPrevisto,
        realizado: contasRealizado,
        totalItens: contasSubcats.length,
        realizados: contasRealizados,
        status: resumoStatus(contasPrevisto, contasRealizado, contasSubcats.length, contasRealizados)
      };

      Object.keys(t).forEach((bloco) => {
        const totalEl = document.getElementById(`total-${bloco}`);
        if (totalEl) totalEl.textContent = resumoValor(t[bloco].previsto, t[bloco].realizado);

        const progressEl = document.getElementById(`progress-${bloco}`);
        if (progressEl) progressEl.textContent = t[bloco].status;
      });

      setSaldoResumo('s-receitas', t.receitas?.previsto || 0, t.receitas?.realizado || 0);
      setSaldoResumo('s-pagar', t['pagar-primeiro']?.previsto || 0, t['pagar-primeiro']?.realizado || 0);
      setSaldoResumo('s-doar', t.doar?.previsto || 0, t.doar?.realizado || 0);
      setSaldoResumo('s-contas', t.contas?.previsto || 0, t.contas?.realizado || 0);
      setSaldoResumo('s-invest', t.investimentos?.previsto || 0, t.investimentos?.realizado || 0);
      setSaldoResumo('s-desfrute', t.desfrute?.previsto || 0, t.desfrute?.realizado || 0);

      const saldoPrevisto = (t.receitas?.previsto || 0) - BLOCOS_SAIDA.reduce((acc, bloco) => acc + (t[bloco]?.previsto || 0), 0);
      const saldoRealizado = (t.receitas?.realizado || 0) - BLOCOS_SAIDA.reduce((acc, bloco) => acc + (t[bloco]?.realizado || 0), 0);
      const totalEl = document.getElementById('s-total');
      if (!totalEl) return;
      totalEl.textContent = fr(saldoRealizado);
      totalEl.className = `saldo-final-value${saldoRealizado < 0 ? ' neg' : ''}`;

      setText('s-total-previsto', `Previsto: ${fr(saldoPrevisto)}`);

      return t;
    };

    const atualizarTotalGrupo = (gi) => {
      const el = document.getElementById(`gtotal-${gi}`);
      if (!el) return;
      const subcats = (dados.contas[gi]?.subcats || []).map(ensureItemShape);
      const previsto = subcats.reduce((acc, sub) => acc + getPrevisto(sub), 0);
      const realizado = subcats.filter((sub) => sub.realized).reduce((acc, sub) => acc + getRealizadoBase(sub), 0);
      el.textContent = resumoValor(previsto, realizado);
    };

    const renderSubcats = (gi) => {
      const container = document.getElementById(`subcats-${gi}`);
      if (!container) return;
      container.innerHTML = '';

      (dados.contas[gi]?.subcats || []).forEach((rawSub, si) => {
        const sub = ensureItemShape(rawSub);
        const row = document.createElement('div');
        row.className = `subcat-row${sub.realized ? ' is-realized' : ''}`;
        row.innerHTML = `<label class="row-check-wrap" onclick="event.stopPropagation()">
            <input type="checkbox" class="row-check" ${sub.realized ? 'checked' : ''} onchange="toggleSubcatRealized(${gi},${si},this.checked)">
            <span class="row-check-ui">${sub.realized ? '✓' : ''}</span>
          </label>
          <div class="subcat-main">
            <div class="subcat-nome${sub.realized ? ' done' : ''}">${esc(sub.nome)}</div>
            <div class="subcat-meta">${sub.realized ? 'Pago' : 'Pendente'}</div>
          </div>
          <button class="subcat-amount-btn${sub.realized ? ' realized' : ''}" onclick="openSubcatEditor(${gi},${si})">${esc(rowAmountLabel(sub))}</button>
          <button class="subcat-remove" onclick="removerSubcat(${gi},${si})">✕</button>`;
        container.appendChild(row);
      });

      atualizarTotalGrupo(gi);
    };

    const buildGrupo = (grupo, gi) => {
      const wrap = document.createElement('div');
      wrap.className = 'grupo';
      wrap.id = `grupo-${gi}`;
      wrap.innerHTML = `
        <div class="grupo-header" onclick="toggleGrupo(${gi})">
          <div class="grupo-left"><span class="grupo-arrow">▶</span><span class="grupo-nome">${esc(grupo.nome)}</span></div>
          <div class="grupo-right">
            <span class="grupo-total" id="gtotal-${gi}"></span>
            <button class="grupo-remove-btn" onclick="removerGrupo(event,${gi})">✕</button>
          </div>
        </div>
        <div class="grupo-body" id="gbody-${gi}">
          <div class="add-subcat-row add-subcat-row-top">
            <input type="text" class="add-subcat-input" id="new-sub-${gi}" placeholder="+ Nova subcategoria">
            <button class="add-subcat-btn" onclick="adicionarSubcat(${gi})">Adicionar</button>
          </div>
          <div id="subcats-${gi}"></div>
        </div>`;

      setTimeout(() => renderSubcats(gi), 0);
      return wrap;
    };

    const renderBlocoContas = () => {
      const container = document.getElementById('grupos-contas');
      if (!container) return;
      container.innerHTML = '';
      (dados.contas || []).forEach((grupo, gi) => container.appendChild(buildGrupo(grupo, gi)));
    };

    const renderBlocoSimples = (bloco) => {
      const container = document.getElementById(`cats-${bloco}`);
      if (!container) return;
      container.innerHTML = '';

      (dados[bloco] || []).forEach((rawCat, i) => {
        const cat = ensureItemShape(rawCat);
        const row = document.createElement('div');
        row.className = `cat-row${cat.realized ? ' is-realized' : ''}`;
        row.innerHTML = `<label class="row-check-wrap">
            <input type="checkbox" class="row-check" ${cat.realized ? 'checked' : ''} onchange="toggleSimplesRealized('${bloco}',${i},this.checked)">
            <span class="row-check-ui">${cat.realized ? '✓' : ''}</span>
          </label>
          <div class="cat-main">
            <div class="cat-nome${cat.realized ? ' done' : ''}">${esc(cat.nome)}</div>
            <div class="cat-meta">${cat.realized ? 'Pago' : 'Pendente'}</div>
          </div>
          <button class="cat-amount-btn${cat.realized ? ' realized' : ''}" onclick="openSimplesEditor('${bloco}',${i})">${esc(rowAmountLabel(cat))}</button>
          <button class="cat-remove" onclick="removerCat('${bloco}',${i})">✕</button>`;
        container.appendChild(row);
      });
    };

    const renderTudo = () => {
      ['receitas', 'pagar-primeiro', 'doar', 'investimentos', 'desfrute'].forEach(renderBlocoSimples);
      renderBlocoContas();
      calcularTotais();
    };

    const carregarDados = async () => {
      const mes = document.getElementById('mesSelect')?.value;
      const ano = document.getElementById('anoSelect')?.value;
      if (!mes || !ano) return;

      const payload = await apiRequest(targetFinancePath(`/api/finance/month?month=${mes}&year=${ano}`));
      dados = normalizeFinancialData(payload?.data && Object.keys(payload.data).length > 0 ? payload.data : cloneDefaultFinancialData());
      renderTudo();
    };

    const trocarMes = async () => {
      await carregarDados();
    };

    const toggleBloco = (bloco) => {
      document.getElementById(`bloco-${bloco}`)?.classList.toggle('open');
    };

    const toggleGrupo = (gi) => {
      document.getElementById(`grupo-${gi}`)?.classList.toggle('gopen');
    };

    const adicionarCat = (bloco) => {
      const input = document.getElementById(`new-${bloco}`);
      const nome = input?.value.trim();
      if (!nome) return;

      if (!dados[bloco]) dados[bloco] = [];
      dados[bloco].push(createFinanceItem(nome, '0'));
      input.value = '';
      renderBlocoSimples(bloco);
      calcularTotais();
      agendarSalvar();
      toast('Categoria adicionada');

      if (perguntarReplicarInclusao()) {
        replicarEstrutura(
          { type: 'add_category', bloco, nome },
          'Campo replicado para os demais meses'
        );
      }
    };

    const removerCat = (bloco, i) => {
      const nome = dados[bloco]?.[i]?.nome;
      const replicar = Boolean(nome) && perguntarReplicarExclusao();
      dados[bloco].splice(i, 1);
      renderBlocoSimples(bloco);
      calcularTotais();
      agendarSalvar();

      if (replicar) {
        replicarEstrutura(
          { type: 'remove_category', bloco, nome },
          'Exclusão replicada para os demais meses'
        );
      }
    };

    const atualizarSimples = (bloco, i, campo, val) => {
      const item = dados[bloco]?.[i];
      if (!item) return;

      ensureItemShape(item);

      if (campo === 'valor_realizado') {
        item.valor_realizado = val;
        item.realized = true;
      } else {
        item.valor_previsto = val;
        item.valor = val;
      }

      calcularTotais();
      agendarSalvar();
    };

    const openSimplesEditor = (bloco, i) => {
      openEditor({ kind: 'simple', bloco, index: i });
    };

    const toggleSimplesRealized = async (bloco, i, checked) => {
      const item = dados[bloco]?.[i];
      if (!item) return;

      ensureItemShape(item);
      const prevRealized = item.realized;
      const prevValorRealizado = item.valor_realizado;
      item.realized = Boolean(checked);

      if (item.realized) {
        const atual = pm(item.valor_realizado);
        if (atual <= 0) {
          item.valor_realizado = item.valor_previsto ?? item.valor ?? '0';
        }
      } else {
        item.valor_realizado = '0';
      }

      renderBlocoSimples(bloco);
      calcularTotais();

      const dot = document.getElementById('save-dot');
      const lbl = document.getElementById('save-label');
      dot?.classList.add('saving');
      if (lbl) lbl.textContent = 'Salvando...';

      try {
        const payload = await persistToggleRealized({
          bloco,
          itemIndex: i,
          realized: item.realized,
          valorRealizado: item.valor_realizado
        });

        dados = normalizeFinancialData(payload?.data || dados);
        renderBlocoSimples(bloco);
        calcularTotais();
        emitCoinsAwardFeedback(payload);

        dot?.classList.remove('saving');
        if (lbl) {
          lbl.textContent = '✓ Salvo';
          setTimeout(() => {
            if (lbl.textContent === '✓ Salvo') lbl.textContent = '';
          }, 2500);
        }
      } catch (_) {
        item.realized = prevRealized;
        item.valor_realizado = prevValorRealizado;
        renderBlocoSimples(bloco);
        calcularTotais();
        dot?.classList.remove('saving');
        if (lbl) lbl.textContent = '⚠ Erro ao salvar';
        toast('Não foi possível atualizar o item');
      }
    };

    const adicionarGrupo = () => {
      const input = document.getElementById('new-grupo-contas');
      const nome = input?.value.trim();
      if (!nome) return;
      ensureDadosShape();
      dados.contas.push({ nome, subcats: [] });
      input.value = '';
      renderBlocoContas();
      const gi = dados.contas.length - 1;
      setTimeout(() => document.getElementById(`grupo-${gi}`)?.classList.add('gopen'), 30);
      calcularTotais();
      agendarSalvar();
      toast('Grupo adicionado');

      if (perguntarReplicarInclusao()) {
        replicarEstrutura({ type: 'add_group', nome }, 'Grupo replicado para os demais meses');
      }
    };

    const removerGrupo = (event, gi) => {
      event.stopPropagation();
      if ((dados.contas[gi]?.subcats || []).length > 0 && !window.confirm(`Remover "${dados.contas[gi].nome}"?`)) return;
      const nomeGrupo = dados.contas[gi]?.nome;
      const replicar = Boolean(nomeGrupo) && perguntarReplicarExclusao();
      dados.contas.splice(gi, 1);
      renderBlocoContas();
      calcularTotais();
      agendarSalvar();

      if (replicar) {
        replicarEstrutura(
          { type: 'remove_group', nome: nomeGrupo },
          'Exclusão replicada para os demais meses'
        );
      }
    };

    const adicionarSubcat = (gi) => {
      const input = document.getElementById(`new-sub-${gi}`);
      const nome = input?.value.trim();
      if (!nome) return;
      const groupName = dados.contas[gi]?.nome;
      dados.contas[gi].subcats.push(createContaSubcat(nome, '0'));
      input.value = '';
      renderSubcats(gi);
      calcularTotais();
      agendarSalvar();
      toast('Subcategoria adicionada');

      if (groupName && perguntarReplicarInclusao()) {
        replicarEstrutura(
          { type: 'add_subcategory', groupName, nome },
          'Subcategoria replicada para os demais meses'
        );
      }
    };

    const removerSubcat = (gi, si) => {
      const groupName = dados.contas[gi]?.nome;
      const nome = dados.contas[gi]?.subcats?.[si]?.nome;
      const replicar = Boolean(groupName && nome) && perguntarReplicarExclusao();
      dados.contas[gi].subcats.splice(si, 1);
      renderSubcats(gi);
      calcularTotais();
      agendarSalvar();

      if (replicar) {
        replicarEstrutura(
          { type: 'remove_subcategory', groupName, nome },
          'Exclusão replicada para os demais meses'
        );
      }
    };

    const atualizarSubcat = (gi, si, campo, val) => {
      const item = dados.contas?.[gi]?.subcats?.[si];
      if (!item) return;

      ensureItemShape(item);

      if (campo === 'valor_realizado') {
        item.valor_realizado = val;
        item.realized = true;
      } else {
        item.valor_previsto = val;
        item.valor = val;
      }

      atualizarTotalGrupo(gi);
      calcularTotais();
      agendarSalvar();
    };

    const openSubcatEditor = (gi, si) => {
      openEditor({ kind: 'subcat', gi, si });
    };

    const toggleSubcatRealized = async (gi, si, checked) => {
      const item = dados.contas?.[gi]?.subcats?.[si];
      if (!item) return;

      ensureItemShape(item);
      const prevRealized = item.realized;
      const prevValorRealizado = item.valor_realizado;
      item.realized = Boolean(checked);

      if (item.realized) {
        const atual = pm(item.valor_realizado);
        if (atual <= 0) {
          item.valor_realizado = item.valor_previsto ?? item.valor ?? '0';
        }
      } else {
        item.valor_realizado = '0';
      }

      renderSubcats(gi);
      calcularTotais();

      const dot = document.getElementById('save-dot');
      const lbl = document.getElementById('save-label');
      dot?.classList.add('saving');
      if (lbl) lbl.textContent = 'Salvando...';

      try {
        const payload = await persistToggleRealized({
          bloco: 'contas',
          grupoIndex: gi,
          subcatIndex: si,
          realized: item.realized,
          valorRealizado: item.valor_realizado
        });

        dados = normalizeFinancialData(payload?.data || dados);
        renderSubcats(gi);
        calcularTotais();
        emitCoinsAwardFeedback(payload);

        dot?.classList.remove('saving');
        if (lbl) {
          lbl.textContent = '✓ Salvo';
          setTimeout(() => {
            if (lbl.textContent === '✓ Salvo') lbl.textContent = '';
          }, 2500);
        }
      } catch (_) {
        item.realized = prevRealized;
        item.valor_realizado = prevValorRealizado;
        renderSubcats(gi);
        calcularTotais();
        dot?.classList.remove('saving');
        if (lbl) lbl.textContent = '⚠ Erro ao salvar';
        toast('Não foi possível atualizar o item');
      }
    };

    const limparMes = async () => {
      if (!window.confirm('Zerar todos os valores deste mês?')) return;
      SIMPLE_BLOCK_KEYS.forEach((bloco) =>
        (dados[bloco] || []).forEach((cat) => {
          const item = ensureItemShape(cat);
          item.valor_previsto = '';
          item.valor = '';
          item.valor_realizado = '0';
          item.realized = false;
        })
      );
      (dados.contas || []).forEach((grupo) =>
        (grupo.subcats || []).forEach((sub) => {
          const item = ensureItemShape(sub);
          item.valor_previsto = '';
          item.valor = '';
          item.valor_realizado = '0';
          item.realized = false;
        })
      );
      renderTudo();
      agendarSalvar();
      toast('Mês zerado');
    };

    const exportarTexto = () => {
      const mes = document.getElementById('mesSelect')?.value;
      const ano = document.getElementById('anoSelect')?.value;
      const MESES = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

      let txt = `CONTROLE FINANCEIRO — MÉTODO JACKSON SOUZA\n${MESES[parseInt(mes, 10)]} ${ano}\n${'═'.repeat(42)}\n\n`;

      [
        { key: 'receitas', label: '1. RECEITAS' },
        { key: 'pagar-primeiro', label: '2. SE PAGAR PRIMEIRO' },
        { key: 'doar', label: '3. DOAR' }
      ].forEach(({ key, label }) => {
        txt += `${label}\n${'─'.repeat(30)}\n`;
        (dados[key] || [])
          .map(ensureItemShape)
          .filter((c) => getPrevisto(c) > 0 || (c.realized && getRealizadoBase(c) > 0))
          .forEach((c) => {
            txt += `  ${c.nome.padEnd(16)} Prev ${fr(getPrevisto(c))} | Real ${fr(c.realized ? getRealizadoBase(c) : 0)}${c.realized ? ' ✓' : ''}\n`;
          });
        txt += `  ${'TOTAL PREV'.padEnd(16)} ${fr((dados[key] || []).reduce((a, c) => a + getPrevisto(ensureItemShape(c)), 0))}\n`;
        txt += `  ${'TOTAL REAL'.padEnd(16)} ${fr((dados[key] || []).reduce((a, c) => a + (ensureItemShape(c).realized ? getRealizadoBase(c) : 0), 0))}\n\n`;
      });

      const totalContasPrev = (dados.contas || []).reduce((a, g) => a + (g.subcats || []).reduce((b, s) => b + getPrevisto(ensureItemShape(s)), 0), 0);
      const totalContasReal = (dados.contas || []).reduce(
        (a, g) => a + (g.subcats || []).reduce((b, s) => b + (ensureItemShape(s).realized ? getRealizadoBase(s) : 0), 0),
        0
      );
      txt += `4. PAGAR AS CONTAS\n${'─'.repeat(30)}\n`;

      (dados.contas || []).forEach((g) => {
        const gtPrev = (g.subcats || []).reduce((a, s) => a + getPrevisto(ensureItemShape(s)), 0);
        const gtReal = (g.subcats || []).reduce((a, s) => a + (ensureItemShape(s).realized ? getRealizadoBase(s) : 0), 0);
        if (!gtPrev && !gtReal) return;
        txt += `  ${g.nome}\n`;
        (g.subcats || [])
          .map(ensureItemShape)
          .filter((s) => getPrevisto(s) > 0 || (s.realized && getRealizadoBase(s) > 0))
          .forEach((s) => {
            txt += `    ${s.nome.padEnd(14)} Prev ${fr(getPrevisto(s))} | Real ${fr(s.realized ? getRealizadoBase(s) : 0)}${s.realized ? ' ✓' : ''}\n`;
          });
        txt += `    ${'Subtotal Prev'.padEnd(18)} ${fr(gtPrev)}\n`;
        txt += `    ${'Subtotal Real'.padEnd(18)} ${fr(gtReal)}\n`;
      });

      txt += `  ${'TOTAL PREV'.padEnd(16)} ${fr(totalContasPrev)}\n`;
      txt += `  ${'TOTAL REAL'.padEnd(16)} ${fr(totalContasReal)}\n\n`;

      [
        { key: 'investimentos', label: '5. INVESTIMENTOS' },
        { key: 'desfrute', label: '6. DESFRUTE' }
      ].forEach(({ key, label }) => {
        txt += `${label}\n${'─'.repeat(30)}\n`;
        (dados[key] || [])
          .map(ensureItemShape)
          .filter((c) => getPrevisto(c) > 0 || (c.realized && getRealizadoBase(c) > 0))
          .forEach((c) => {
            txt += `  ${c.nome.padEnd(16)} Prev ${fr(getPrevisto(c))} | Real ${fr(c.realized ? getRealizadoBase(c) : 0)}${c.realized ? ' ✓' : ''}\n`;
          });
        txt += `  ${'TOTAL PREV'.padEnd(16)} ${fr((dados[key] || []).reduce((a, c) => a + getPrevisto(ensureItemShape(c)), 0))}\n`;
        txt += `  ${'TOTAL REAL'.padEnd(16)} ${fr((dados[key] || []).reduce((a, c) => a + (ensureItemShape(c).realized ? getRealizadoBase(c) : 0), 0))}\n\n`;
      });

      const receitasPrev = (dados.receitas || []).reduce((a, c) => a + getPrevisto(ensureItemShape(c)), 0);
      const receitasReal = (dados.receitas || []).reduce(
        (a, c) => a + (ensureItemShape(c).realized ? getRealizadoBase(c) : 0),
        0
      );
      const saidasPrev = BLOCOS_SAIDA.reduce((a, bloco) => {
        if (bloco === 'contas') return a + totalContasPrev;
        return a + (dados[bloco] || []).reduce((x, c) => x + getPrevisto(ensureItemShape(c)), 0);
      }, 0);
      const saidasReal = BLOCOS_SAIDA.reduce((a, bloco) => {
        if (bloco === 'contas') return a + totalContasReal;
        return a + (dados[bloco] || []).reduce((x, c) => x + (ensureItemShape(c).realized ? getRealizadoBase(c) : 0), 0);
      }, 0);

      txt += `${'═'.repeat(42)}\nSALDO PREVISTO: ${fr(receitasPrev - saidasPrev)}\nSALDO REALIZADO: ${fr(receitasReal - saidasReal)}\n`;

      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `financas_${mes}_${ano}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Resumo exportado');
    };

    const logout = async () => {
      try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
      } catch (_) {
        // no-op
      }
      try {
        const sb = getBrowserSupabase();
        await sb.auth.signOut();
      } catch (_) {
        // no-op
      }
      window.location.href = '/';
    };

    const handleEnter = (event) => {
      const overlayOpen = document.getElementById('value-sheet-overlay')?.classList.contains('show');
      if (event.key === 'Escape' && overlayOpen) {
        closeEditor();
        return;
      }

      if (overlayOpen && event.key === 'Enter') {
        event.preventDefault();
        saveEditor();
        return;
      }

      if (event.key !== 'Enter') return;
      const el = document.activeElement;
      if (!el) return;

      if (el.id === 'new-grupo-contas') adicionarGrupo();
      else if (el.id.startsWith('new-sub-')) adicionarSubcat(parseInt(el.id.replace('new-sub-', ''), 10));
      else if (el.id.startsWith('new-')) adicionarCat(el.id.replace('new-', ''));
    };

    const init = async () => {
      try {
        const payload = await apiRequest(targetFinancePath('/api/profile/me'));
        if (!mounted) return;

        if (!payload?.profile) {
          window.location.href = adminMode ? '/admin' : '/';
          return;
        }

        if (!adminMode && payload.profile.status !== 'active') {
          await logout();
          return;
        }

        if (!adminMode && payload.profile.role === 'admin') {
          window.location.href = '/admin';
          return;
        }

        if (adminMode && !payload?.impersonation?.active) {
          window.location.href = '/admin';
          return;
        }

        const tier = payload.profile.tier || 'DESPERTAR';
        const canAccess = adminMode ? true : ALLOWED_MAVF_TIERS.includes(tier);
        let hasActiveSession = false;

        if (canAccess) {
          try {
            const sessionsPayload = await apiRequest(targetFinancePath('/api/mavf/sessions'));
            const sessions = Array.isArray(sessionsPayload?.sessions) ? sessionsPayload.sessions : [];
            hasActiveSession = sessions.some((session) => session?.status === 'active');
          } catch (_) {
            hasActiveSession = false;
          }
        }

        if (mounted) {
          setCanAccessMavf(canAccess);
          setHasActiveMavfSession(hasActiveSession);
          setImpersonationLabel(
            adminMode ? `Atendendo: ${payload.profile.full_name || payload.profile.email || 'Cliente'}` : ''
          );
        }

        currentUser = payload.user;
        setText('user-name-label', payload.profile.full_name || currentUser.email);

        const now = new Date();
        const mesSelect = document.getElementById('mesSelect');
        const anoSelect = document.getElementById('anoSelect');
        if (mesSelect) mesSelect.value = String(now.getMonth() + 1).padStart(2, '0');
        if (anoSelect) anoSelect.value = String(now.getFullYear());

        await carregarDados();

        const loading = document.getElementById('loading-screen');
        const header = document.getElementById('app-header');
        const main = document.getElementById('app-main');

        if (loading) loading.style.display = 'none';
        if (header) header.style.display = '';
        if (main) main.style.display = '';
      } catch (_) {
        window.location.href = adminMode ? '/admin' : '/';
      }
    };

    window.numOnly = numOnly;
    window.trocarMes = trocarMes;
    window.toggleBloco = toggleBloco;
    window.toggleGrupo = toggleGrupo;
    window.adicionarCat = adicionarCat;
    window.removerCat = removerCat;
    window.atualizarSimples = atualizarSimples;
    window.toggleSimplesRealized = toggleSimplesRealized;
    window.openSimplesEditor = openSimplesEditor;
    window.adicionarGrupo = adicionarGrupo;
    window.removerGrupo = removerGrupo;
    window.adicionarSubcat = adicionarSubcat;
    window.removerSubcat = removerSubcat;
    window.atualizarSubcat = atualizarSubcat;
    window.toggleSubcatRealized = toggleSubcatRealized;
    window.openSubcatEditor = openSubcatEditor;
    window.closeItemEditor = closeEditor;
    window.saveItemEditor = saveEditor;
    window.limparMes = limparMes;
    window.exportarTexto = exportarTexto;
    window.logout = logout;

    document.addEventListener('keydown', handleEnter);
    init();

    return () => {
      mounted = false;
      clearTimeout(saveTimer);
      document.removeEventListener('keydown', handleEnter);
      delete window.numOnly;
      delete window.trocarMes;
      delete window.toggleBloco;
      delete window.toggleGrupo;
      delete window.adicionarCat;
      delete window.removerCat;
      delete window.atualizarSimples;
      delete window.toggleSimplesRealized;
      delete window.openSimplesEditor;
      delete window.adicionarGrupo;
      delete window.removerGrupo;
      delete window.adicionarSubcat;
      delete window.removerSubcat;
      delete window.atualizarSubcat;
      delete window.toggleSubcatRealized;
      delete window.openSubcatEditor;
      delete window.closeItemEditor;
      delete window.saveItemEditor;
      delete window.limparMes;
      delete window.exportarTexto;
      delete window.logout;
    };
  }, [adminMode, adminViewUserId]);

  const mavfLocked = !canAccessMavf;
  const encodedTargetId = adminViewUserId ? encodeURIComponent(adminViewUserId) : null;
  const homeHref = encodedTargetId ? `/admin/users/${encodedTargetId}/dashboard` : '/app';
  const adminMavfHref = encodedTargetId ? `/admin/users/${encodedTargetId}/mavf` : '/mavf';
  const mavfHref = mavfLocked ? '#' : adminMavfHref;
  const logoSrc = theme === 'light' ? '/logo-zeroapp-light.png' : '/logo-zeroapp-dark.png';

  return (
    <>
      <div className="loading-screen" id="loading-screen">
        <div className="spinner" />
        <p>Carregando seus dados...</p>
      </div>

      <header className="header" style={{ display: 'none' }} id="app-header">
        <div className="header-brand">
          <Image className="brand-logo" src={logoSrc} alt="Logo ZeroApp" width={28} height={28} />
          <div>
            <div className="brand-name">Jackson Souza</div>
            <div className="brand-sub">Finanças do Zero</div>
          </div>
        </div>
        <div className="header-nav">
          <a className="top-nav-item active" href={homeHref}>
            <span className="icon">🏠</span>
            Início
          </a>
          <a
            className={`top-nav-item${mavfLocked ? ' locked' : ''}${hasActiveMavfSession ? ' has-notification' : ''}`}
            href={mavfHref}
            onClick={handleMavfClick}
            aria-disabled={mavfLocked}
          >
            <span className="icon">📊</span>
            Meu MAVF
            {mavfLocked ? <span className="top-nav-lock">🔒</span> : null}
            {hasActiveMavfSession ? <span className="top-nav-badge">Ativa</span> : null}
          </a>
        </div>
        <div className="header-right">
          {adminMode ? (
            <a className="btn-back-admin" href="/admin">
              ← Painel admin
            </a>
          ) : null}
          <div className="save-indicator">
            <div className="save-dot" id="save-dot" />
            <span id="save-label" />
          </div>
          <a className="jornada-shortcut-link" href="/jornada" aria-label="Abrir jornada (tier)">
            <TierDisplay
              key={`tier-${tierDisplayKey}-${adminMode ? adminViewUserId : 'self'}`}
              size="sm"
              showName={false}
              userId={adminMode ? adminViewUserId : null}
            />
          </a>
          <a className="jornada-shortcut-link" href="/jornada" aria-label="Abrir jornada (coins)">
            <CoinsDisplay size="sm" />
          </a>
          <div className="user-name" id="user-name-label" />
          <div className="header-month">
            <select className="month-select" id="mesSelect" onChange={() => window.trocarMes?.()}>
              <option value="01">Janeiro</option>
              <option value="02">Fevereiro</option>
              <option value="03">Março</option>
              <option value="04">Abril</option>
              <option value="05">Maio</option>
              <option value="06">Junho</option>
              <option value="07">Julho</option>
              <option value="08">Agosto</option>
              <option value="09">Setembro</option>
              <option value="10">Outubro</option>
              <option value="11">Novembro</option>
              <option value="12">Dezembro</option>
            </select>
            <select className="month-select" id="anoSelect" onChange={() => window.trocarMes?.()}>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
            </select>
          </div>
          <div className="theme-switch">
            <button type="button" className={`theme-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')}>
              Claro
            </button>
            <button type="button" className={`theme-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')}>
              Escuro
            </button>
          </div>
          <button className="btn-logout" onClick={() => window.logout?.()}>
            Sair
          </button>
        </div>

        {!adminMode && headerFaseProgress ? (
          <div className="header-fase-progress-mobile">
            <span className="header-fase-emoji">{headerFaseProgress.emoji}</span>
            <div className="header-fase-track">
              <div
                className="header-fase-fill"
                style={{
                  width: `${Math.max(0, Math.min(100, headerFaseProgress.progressoPct))}%`
                }}
              />
            </div>
            <span className="header-fase-label">
              {headerFaseProgress.coinsParaProxima > 0 && headerFaseProgress.nextName
                ? `${headerFaseProgress.coinsParaProxima} 🪙 para ${headerFaseProgress.nextName}`
                : 'Fase máxima'}
            </span>
          </div>
        ) : null}
      </header>

      <main className="main" style={{ display: 'none' }} id="app-main">
        {adminMode ? (
          <div className="admin-view-banner">
            <span className="admin-view-pill">Admin</span>
            <strong>{impersonationLabel || 'Atendendo cliente'}</strong>
          </div>
        ) : null}
        <div className="intro">
          <div className="intro-title">Sequência do Método</div>
          <div className="intro-steps">
            <span className="step-pill" style={{ color: 'var(--green)', borderColor: 'rgba(0,200,83,0.3)', background: 'rgba(0,200,83,0.06)' }}>
              1 · Receitas
            </span>
            <span className="step-pill" style={{ color: 'var(--gold)', borderColor: 'rgba(255,215,0,0.3)', background: 'rgba(255,215,0,0.06)' }}>
              2 · Se Pagar Primeiro
            </span>
            <span className="step-pill" style={{ color: '#64B4FF', borderColor: 'rgba(100,180,255,0.3)', background: 'rgba(100,180,255,0.06)' }}>
              3 · Doar
            </span>
            <span className="step-pill" style={{ color: 'var(--red)', borderColor: 'rgba(255,68,68,0.3)', background: 'rgba(255,68,68,0.06)' }}>
              4 · Pagar as Contas
            </span>
            <span className="step-pill" style={{ color: '#B464FF', borderColor: 'rgba(180,100,255,0.3)', background: 'rgba(180,100,255,0.06)' }}>
              5 · Investimentos
            </span>
            <span className="step-pill" style={{ color: '#FF8C00', borderColor: 'rgba(255,140,0,0.3)', background: 'rgba(255,140,0,0.06)' }}>
              6 · Desfrute
            </span>
          </div>
        </div>

        <div className="saldos-bar">
          <div className="saldos-grid">
            <div className="saldo-item">
              <div className="saldo-label">Receitas</div>
              <div className="saldo-value" id="s-receitas">
                R$ 0
              </div>
              <div className="saldo-value-prev" id="s-receitas-prev">
                R$ 0
              </div>
            </div>
            <div className="saldo-item">
              <div className="saldo-label">Se Pagar 1°</div>
              <div className="saldo-value" id="s-pagar">
                R$ 0
              </div>
              <div className="saldo-value-prev" id="s-pagar-prev">
                R$ 0
              </div>
            </div>
            <div className="saldo-item">
              <div className="saldo-label">Doação</div>
              <div className="saldo-value" id="s-doar">
                R$ 0
              </div>
              <div className="saldo-value-prev" id="s-doar-prev">
                R$ 0
              </div>
            </div>
            <div className="saldo-item">
              <div className="saldo-label">Contas</div>
              <div className="saldo-value" id="s-contas">
                R$ 0
              </div>
              <div className="saldo-value-prev" id="s-contas-prev">
                R$ 0
              </div>
            </div>
            <div className="saldo-item">
              <div className="saldo-label">Invest.</div>
              <div className="saldo-value" id="s-invest">
                R$ 0
              </div>
              <div className="saldo-value-prev" id="s-invest-prev">
                R$ 0
              </div>
            </div>
            <div className="saldo-item">
              <div className="saldo-label">Desfrute</div>
              <div className="saldo-value" id="s-desfrute">
                R$ 0
              </div>
              <div className="saldo-value-prev" id="s-desfrute-prev">
                R$ 0
              </div>
            </div>
          </div>
          <div className="saldo-final">
            <div>
              <div className="saldo-final-label">Saldo Realizado do Mês</div>
              <div className="saldo-final-meta" id="s-total-previsto">
                Previsto: R$ 0,00
              </div>
            </div>
            <div className="saldo-final-value" id="s-total">
              R$ 0,00
            </div>
          </div>
        </div>

        <div className="actions-bar">
          <button className="btn btn-primary" onClick={() => window.limparMes?.()}>
            ↺ Limpar mês
          </button>
          <button className="btn btn-outline" onClick={() => window.exportarTexto?.()}>
            ↓ Exportar resumo
          </button>
          <a className="btn btn-outline" href="/resumo">
            Ver resumo mensal
          </a>
        </div>

        <div id="blocos">
          <div className="bloco open" data-bloco="receitas" id="bloco-receitas">
            <div className="bloco-header" onClick={() => window.toggleBloco?.('receitas')}>
              <div className="bloco-left">
                <div className="bloco-icon">💰</div>
                <div>
                  <div className="bloco-titulo">1. Receitas</div>
                  <div className="bloco-desc">Todo dinheiro que entra no mês</div>
                </div>
              </div>
              <div className="bloco-right">
                <div className="bloco-total" id="total-receitas">
                  R$ 0 / R$ 0
                </div>
                <div className="bloco-progress" id="progress-receitas">
                  Não iniciado
                </div>
                <div className="bloco-chevron">▼</div>
              </div>
            </div>
            <div className="bloco-body">
              <div className="add-row add-row-top">
                <input type="text" className="add-input" id="new-receitas" placeholder="+ Nova receita (ex: Freelance)" />
                <button className="add-btn" onClick={() => window.adicionarCat?.('receitas')}>
                  Adicionar
                </button>
              </div>
              <div id="cats-receitas" />
            </div>
          </div>

          <div className="bloco" data-bloco="pagar-primeiro" id="bloco-pagar-primeiro">
            <div className="bloco-header" onClick={() => window.toggleBloco?.('pagar-primeiro')}>
              <div className="bloco-left">
                <div className="bloco-icon">⭐</div>
                <div>
                  <div className="bloco-titulo">2. Se Pagar Primeiro</div>
                  <div className="bloco-desc">Antes de qualquer conta, você se paga</div>
                </div>
              </div>
              <div className="bloco-right">
                <div className="bloco-total" id="total-pagar-primeiro">
                  R$ 0 / R$ 0
                </div>
                <div className="bloco-progress" id="progress-pagar-primeiro">
                  Não iniciado
                </div>
                <div className="bloco-chevron">▼</div>
              </div>
            </div>
            <div className="bloco-body">
              <div className="add-row add-row-top">
                <input type="text" className="add-input" id="new-pagar-primeiro" placeholder="+ Adicionar (ex: Reserva de emergência)" />
                <button className="add-btn" onClick={() => window.adicionarCat?.('pagar-primeiro')}>
                  Adicionar
                </button>
              </div>
              <div id="cats-pagar-primeiro" />
            </div>
          </div>

          <div className="bloco" data-bloco="doar" id="bloco-doar">
            <div className="bloco-header" onClick={() => window.toggleBloco?.('doar')}>
              <div className="bloco-left">
                <div className="bloco-icon">🤲</div>
                <div>
                  <div className="bloco-titulo">3. Doar</div>
                  <div className="bloco-desc">Movimento a favor do próximo</div>
                </div>
              </div>
              <div className="bloco-right">
                <div className="bloco-total" id="total-doar">
                  R$ 0 / R$ 0
                </div>
                <div className="bloco-progress" id="progress-doar">
                  Não iniciado
                </div>
                <div className="bloco-chevron">▼</div>
              </div>
            </div>
            <div className="bloco-body">
              <div className="add-row add-row-top">
                <input type="text" className="add-input" id="new-doar" placeholder="+ Adicionar (ex: Missões)" />
                <button className="add-btn" onClick={() => window.adicionarCat?.('doar')}>
                  Adicionar
                </button>
              </div>
              <div id="cats-doar" />
            </div>
          </div>

          <div className="bloco" data-bloco="contas" id="bloco-contas">
            <div className="bloco-header" onClick={() => window.toggleBloco?.('contas')}>
              <div className="bloco-left">
                <div className="bloco-icon">📋</div>
                <div>
                  <div className="bloco-titulo">4. Pagar as Contas</div>
                  <div className="bloco-desc">Grupos com subcategorias personalizáveis</div>
                </div>
              </div>
              <div className="bloco-right">
                <div className="bloco-total" id="total-contas">
                  R$ 0 / R$ 0
                </div>
                <div className="bloco-progress" id="progress-contas">
                  Não iniciado
                </div>
                <div className="bloco-chevron">▼</div>
              </div>
            </div>
            <div className="bloco-body">
              <div className="add-grupo-row add-grupo-row-top">
                <input type="text" className="add-grupo-input" id="new-grupo-contas" placeholder="+ Novo grupo (ex: Saúde, Lazer...)" />
                <button className="add-grupo-btn" onClick={() => window.adicionarGrupo?.()}>
                  + Grupo
                </button>
              </div>
              <div id="grupos-contas" />
            </div>
          </div>

          <div className="bloco" data-bloco="investimentos" id="bloco-investimentos">
            <div className="bloco-header" onClick={() => window.toggleBloco?.('investimentos')}>
              <div className="bloco-left">
                <div className="bloco-icon">📈</div>
                <div>
                  <div className="bloco-titulo">5. Investimentos</div>
                  <div className="bloco-desc">Construção de patrimônio</div>
                </div>
              </div>
              <div className="bloco-right">
                <div className="bloco-total" id="total-investimentos">
                  R$ 0 / R$ 0
                </div>
                <div className="bloco-progress" id="progress-investimentos">
                  Não iniciado
                </div>
                <div className="bloco-chevron">▼</div>
              </div>
            </div>
            <div className="bloco-body">
              <div className="add-row add-row-top">
                <input type="text" className="add-input" id="new-investimentos" placeholder="+ Adicionar (ex: Tesouro Direto)" />
                <button className="add-btn" onClick={() => window.adicionarCat?.('investimentos')}>
                  Adicionar
                </button>
              </div>
              <div id="cats-investimentos" />
            </div>
          </div>

          <div className="bloco" data-bloco="desfrute" id="bloco-desfrute">
            <div className="bloco-header" onClick={() => window.toggleBloco?.('desfrute')}>
              <div className="bloco-left">
                <div className="bloco-icon">🌟</div>
                <div>
                  <div className="bloco-titulo">6. Desfrute</div>
                  <div className="bloco-desc">Viver bem faz parte do plano</div>
                </div>
              </div>
              <div className="bloco-right">
                <div className="bloco-total" id="total-desfrute">
                  R$ 0 / R$ 0
                </div>
                <div className="bloco-progress" id="progress-desfrute">
                  Não iniciado
                </div>
                <div className="bloco-chevron">▼</div>
              </div>
            </div>
            <div className="bloco-body">
              <div className="add-row add-row-top">
                <input type="text" className="add-input" id="new-desfrute" placeholder="+ Adicionar (ex: Cinema)" />
                <button className="add-btn" onClick={() => window.adicionarCat?.('desfrute')}>
                  Adicionar
                </button>
              </div>
              <div id="cats-desfrute" />
            </div>
          </div>
        </div>

        {adminMode ? null : (
          <section className="perfil-section" id="perfil">
            <div className="perfil-header">
              <h3>Perfil e Jornada</h3>
              <a className="perfil-link" href="/jornada">
                Ver jornada completa
              </a>
            </div>

            <p className="perfil-copy">Tem um código do Workshop? Resgate para desbloquear MOVIMENTO e ganhar +500 coins.</p>

            <form className="perfil-redeem-form" onSubmit={handleRedeemWorkshop}>
              <input
                type="text"
                className="perfil-redeem-input"
                placeholder="Digite seu código (ex: WS-ABC12345)"
                value={workshopCode}
                onChange={(event) => setWorkshopCode(event.target.value)}
                autoComplete="off"
              />
              <button type="submit" className="perfil-redeem-btn" disabled={redeemLoading}>
                {redeemLoading ? 'Resgatando...' : 'Resgatar'}
              </button>
            </form>
          </section>
        )}
      </main>

      {!adminMode ? <BottomNav activeTab="inicio" /> : null}

      <div className="value-sheet-overlay" id="value-sheet-overlay" onClick={() => window.closeItemEditor?.()}>
        <div className="value-sheet" onClick={(event) => event.stopPropagation()}>
          <div className="value-sheet-title" id="sheet-item-title">
            Item
          </div>
          <div className="value-sheet-status" id="sheet-item-status">
            Status atual
          </div>
          <div className="value-sheet-grid">
            <label className="value-field">
              <span>Previsto</span>
              <input type="text" id="sheet-previsto-input" inputMode="decimal" placeholder="R$ 0,00" />
            </label>
            <label className="value-field">
              <span>Realizado</span>
              <input type="text" id="sheet-realizado-input" inputMode="decimal" placeholder="R$ 0,00" />
            </label>
          </div>
          <div className="value-sheet-actions">
            <button className="btn-sheet btn-sheet-ghost" onClick={() => window.closeItemEditor?.()}>
              Cancelar
            </button>
            <button className="btn-sheet" onClick={() => window.saveItemEditor?.()}>
              Salvar
            </button>
          </div>
        </div>
      </div>

      <div className="toast" id="toast" />

      <style jsx global>{`
        :global(:root) {
          --bg: #0a0a0a;
          --bg2: #141414;
          --bg3: #1c1c1c;
          --bg4: #222;
          --border: #2a2a2a;
          --border2: #242424;
          --green: #00c853;
          --green-dim: rgba(0, 200, 83, 0.08);
          --green-glow: rgba(0, 200, 83, 0.25);
          --red: #ff4444;
          --gold: #ffd700;
          --text: #f0f0f0;
          --muted: #555;
          --dim: #888;
          --line-soft: rgba(255, 255, 255, 0.025);
          --line-softer: rgba(255, 255, 255, 0.02);
          --hover-soft: rgba(255, 255, 255, 0.018);
          --hover-softer: rgba(255, 255, 255, 0.012);
          --btn-outline-hover-border: #444;
          --theme-pill: #171717;
          --theme-pill-border: #2a2a2a;
          --theme-pill-text: #b6cdbf;
          --theme-pill-active-bg: #00c853;
          --theme-pill-active-text: #05110a;
        }

        :global(:root[data-theme='light']) {
          --bg: #edf4ef;
          --bg2: #ffffff;
          --bg3: #e8f0ea;
          --bg4: #dfe8e1;
          --border: #cad8cf;
          --border2: #d7e2da;
          --green: #00a54a;
          --green-dim: rgba(0, 165, 74, 0.12);
          --green-glow: rgba(0, 165, 74, 0.2);
          --red: #d74141;
          --gold: #b79100;
          --text: #16261d;
          --muted: #5c7467;
          --dim: #3d5348;
          --line-soft: rgba(22, 38, 29, 0.08);
          --line-softer: rgba(22, 38, 29, 0.06);
          --hover-soft: rgba(22, 38, 29, 0.06);
          --hover-softer: rgba(22, 38, 29, 0.04);
          --btn-outline-hover-border: #8ba496;
          --theme-pill: #f6faf7;
          --theme-pill-border: #c4d5ca;
          --theme-pill-text: #385146;
          --theme-pill-active-bg: #00a54a;
          --theme-pill-active-text: #ffffff;
        }

        :global(body) {
          background: var(--bg);
          color: var(--text);
          font-family: 'Sora', sans-serif;
          min-height: 100vh;
        }

        .header {
          background: var(--bg);
          border-bottom: 1px solid var(--border);
          padding: 0 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 56px;
          position: sticky;
          top: 0;
          z-index: 200;
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-nav {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 0 14px;
          flex: 1;
        }

        .top-nav-item {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 11px;
          border: 1px solid var(--border);
          border-radius: 9px;
          text-decoration: none;
          font-size: 12px;
          color: var(--dim);
          background: transparent;
          transition: all 0.15s;
          position: relative;
        }

        .top-nav-item:hover {
          color: var(--text);
          background: var(--bg3);
        }

        .top-nav-item.active {
          color: var(--green);
          border-color: rgba(0, 200, 83, 0.35);
          background: var(--green-dim);
          font-weight: 600;
        }

        .top-nav-item .icon {
          font-size: 14px;
          line-height: 1;
        }

        .top-nav-item.locked {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .top-nav-lock {
          margin-left: 2px;
          font-size: 12px;
        }

        .top-nav-badge {
          margin-left: 2px;
          font-size: 10px;
          font-weight: 700;
          color: #06170d;
          background: var(--green);
          border-radius: 999px;
          padding: 2px 6px;
        }

        .top-nav-item.has-notification::before {
          content: '';
          position: absolute;
          top: 4px;
          right: 4px;
          width: 6px;
          height: 6px;
          background: var(--green);
          border-radius: 50%;
        }

        .brand-logo {
          width: 28px;
          height: 28px;
          border-radius: 8px;
          object-fit: cover;
          box-shadow: 0 0 0 1px rgba(0, 200, 83, 0.28), 0 6px 20px rgba(0, 200, 83, 0.25);
        }

        .brand-name {
          font-family: 'Space Mono', monospace;
          font-size: 13px;
          color: var(--green);
        }

        .brand-sub {
          font-size: 10px;
          color: var(--muted);
          letter-spacing: 2px;
          text-transform: uppercase;
          margin-top: 2px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .jornada-shortcut-link {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          border-radius: 999px;
        }

        .jornada-shortcut-link:focus-visible {
          outline: 2px solid var(--green);
          outline-offset: 2px;
        }

        .header-fase-progress-mobile {
          display: none;
        }

        .theme-switch {
          display: inline-flex;
          background: var(--theme-pill);
          border: 1px solid var(--theme-pill-border);
          border-radius: 999px;
          padding: 3px;
          gap: 3px;
        }

        .theme-btn {
          border: none;
          background: transparent;
          color: var(--theme-pill-text);
          border-radius: 999px;
          font-family: 'Sora', sans-serif;
          font-size: 10px;
          font-weight: 600;
          padding: 5px 10px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .theme-btn.active {
          background: var(--theme-pill-active-bg);
          color: var(--theme-pill-active-text);
        }

        .user-name {
          font-size: 12px;
          color: var(--dim);
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .header-month {
          display: flex;
          gap: 8px;
        }

        .month-select {
          background: var(--bg3);
          border: 1px solid var(--border);
          color: var(--text);
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 8px;
          cursor: pointer;
          outline: none;
        }

        .month-select:focus {
          border-color: var(--green);
        }

        .btn-logout {
          background: none;
          border: 1px solid var(--border);
          color: var(--dim);
          border-radius: 8px;
          font-size: 11px;
          padding: 6px 12px;
          cursor: pointer;
          font-family: 'Sora', sans-serif;
          transition: all 0.15s;
        }

        .btn-logout:hover {
          border-color: var(--red);
          color: var(--red);
        }

        .btn-back-admin {
          text-decoration: none;
          border: 1px solid rgba(68, 136, 255, 0.35);
          color: var(--blue);
          background: rgba(68, 136, 255, 0.1);
          border-radius: 8px;
          font-size: 11px;
          padding: 6px 10px;
          font-weight: 700;
          white-space: nowrap;
        }

        .btn-back-admin:hover {
          background: var(--blue);
          color: #fff;
        }

        @media (max-width: 1080px) {
          .header-nav {
            display: none;
          }
        }

        @media (max-width: 880px) {
          .header {
            padding: 0 10px;
          }
          .header-right {
            gap: 8px;
          }
          .user-name {
            display: none;
          }
          .month-select {
            font-size: 11px;
            padding: 6px 8px;
          }
          .theme-btn {
            padding: 4px 8px;
          }
        }

        @media (max-width: 620px) {
          .header {
            height: auto;
            padding: 8px 10px;
            flex-wrap: wrap;
            row-gap: 8px;
          }

          .header-right {
            gap: 7px;
            width: 100%;
            justify-content: flex-end;
            flex-wrap: wrap;
          }

          .save-indicator {
            display: none;
          }
          .brand-sub {
            display: none;
          }
          .btn-logout {
            padding: 6px 9px;
          }
          .btn-back-admin {
            padding: 6px 8px;
            font-size: 10px;
          }

          .header-fase-progress-mobile {
            display: flex;
            align-items: center;
            gap: 7px;
            width: 100%;
            padding-top: 2px;
          }

          .header-fase-emoji {
            font-size: 14px;
            line-height: 1;
          }

          .header-fase-track {
            flex: 1;
            height: 6px;
            border-radius: 999px;
            overflow: hidden;
            background: rgba(255, 255, 255, 0.12);
          }

          .header-fase-fill {
            height: 100%;
            background: linear-gradient(90deg, #ffd700, #00c853);
          }

          .header-fase-label {
            font-size: 10px;
            color: var(--muted);
            white-space: nowrap;
          }
        }

        .save-indicator {
          font-size: 10px;
          color: var(--muted);
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .save-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--green);
          animation: blink 1s ease infinite;
          display: none;
        }

        .save-dot.saving {
          display: block;
        }

        @keyframes blink {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.2;
          }
        }

        .main {
          max-width: 780px;
          margin: 0 auto;
          padding: 24px 16px 80px;
        }

        .admin-view-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(68, 136, 255, 0.32);
          background: rgba(68, 136, 255, 0.1);
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 14px;
          font-size: 12px;
        }

        .admin-view-pill {
          border-radius: 999px;
          padding: 3px 8px;
          border: 1px solid rgba(68, 136, 255, 0.45);
          color: var(--blue);
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.7px;
          font-weight: 800;
        }

        @media (max-width: 760px) {
          .main {
            padding: 14px 10px 120px;
          }

          .intro {
            margin-bottom: 14px;
          }

          .intro-title {
            font-size: 10px;
            letter-spacing: 1.2px;
            margin-bottom: 7px;
          }

          .step-pill {
            font-size: 10px;
            padding: 4px 8px;
          }

          .saldos-bar {
            margin-bottom: 14px;
            border-radius: 18px;
            padding: 14px 12px;
          }

          .saldos-grid {
            gap: 8px;
            margin-bottom: 12px;
          }

          .saldo-label {
            font-size: 8px;
            letter-spacing: 1px;
          }

          .saldo-value {
            font-size: 12px;
          }

          .saldo-value-prev {
            font-size: 9px;
            margin-top: 2px;
          }

          .saldo-final {
            align-items: flex-end;
            gap: 12px;
          }

          .saldo-final-value {
            font-size: 26px;
          }

          .actions-bar {
            gap: 6px;
            margin-bottom: 14px;
          }

          .btn {
            flex: 1 1 calc(50% - 6px);
            padding: 10px 12px;
            font-size: 11px;
          }

          .bloco {
            margin-bottom: 10px;
            border-radius: 18px;
          }

          .bloco-header {
            padding: 14px 12px;
          }

          .bloco-icon {
            width: 40px;
            height: 40px;
            border-radius: 11px;
            font-size: 18px;
          }

          .bloco-titulo {
            font-size: 18px;
            line-height: 1.1;
          }

          .bloco-desc {
            margin-top: 3px;
            font-size: 12px;
          }

          .bloco-total {
            font-size: 13px;
          }

          .bloco-progress {
            font-size: 10px;
          }

          .add-row,
          .add-grupo-row {
            padding: 10px 12px;
          }

          .add-subcat-row {
            padding: 8px 10px 8px 28px;
          }

          .cat-row {
            padding: 10px 12px;
          }

          .subcat-row {
            padding: 8px 10px 8px 28px;
          }

          .cat-nome {
            font-size: 17px;
            line-height: 1.1;
          }

          .subcat-nome {
            font-size: 14px;
            line-height: 1.1;
          }

          .cat-meta,
          .subcat-meta {
            font-size: 10px;
            margin-top: 4px;
          }

          .cat-amount-btn {
            min-width: 106px;
            font-size: 12px;
            padding: 7px 8px;
          }

          .subcat-amount-btn {
            min-width: 94px;
            font-size: 10px;
            padding: 6px 7px;
          }
        }

        .intro {
          margin-bottom: 24px;
        }

        .intro-title {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: var(--muted);
          margin-bottom: 8px;
        }

        .intro-steps {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .step-pill {
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 20px;
          font-weight: 500;
          border: 1px solid;
        }

        .saldos-bar {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 18px 20px;
          margin-bottom: 24px;
        }

        .saldos-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        @media (max-width: 600px) {
          .saldos-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .saldo-item {
          text-align: center;
        }

        .saldo-label {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          color: var(--muted);
          margin-bottom: 5px;
        }

        .saldo-value {
          font-family: 'Space Mono', monospace;
          font-size: 13px;
          font-weight: 700;
          color: var(--green);
        }

        .saldo-value-prev {
          margin-top: 3px;
          font-family: 'Space Mono', monospace;
          font-size: 10px;
          font-weight: 600;
          color: var(--dim);
          line-height: 1.2;
        }

        .saldo-final {
          border-top: 1px solid var(--border);
          padding-top: 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .saldo-final-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: var(--muted);
        }

        .saldo-final-meta {
          margin-top: 4px;
          font-size: 11px;
          color: var(--dim);
        }

        .saldo-final-value {
          font-family: 'Space Mono', monospace;
          font-size: 20px;
          font-weight: 700;
          color: var(--green);
          transition: color 0.3s;
        }

        .saldo-final-value.neg {
          color: var(--red);
        }

        .actions-bar {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .btn {
          border-radius: 10px;
          font-family: 'Sora', sans-serif;
          font-size: 12px;
          font-weight: 600;
          padding: 9px 18px;
          cursor: pointer;
          border: none;
          transition: all 0.15s;
        }

        .btn-primary {
          background: var(--green);
          color: #000;
        }

        .btn-primary:hover {
          background: #00e060;
        }

        .btn-outline {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--dim);
        }

        .btn-outline:hover {
          border-color: var(--btn-outline-hover-border);
          color: var(--text);
        }

        .bloco {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 16px;
          margin-bottom: 12px;
          overflow: hidden;
          animation: slideIn 0.3s ease both;
        }

        .bloco:nth-child(1) {
          animation-delay: 0.04s;
        }
        .bloco:nth-child(2) {
          animation-delay: 0.08s;
        }
        .bloco:nth-child(3) {
          animation-delay: 0.12s;
        }
        .bloco:nth-child(4) {
          animation-delay: 0.16s;
        }
        .bloco:nth-child(5) {
          animation-delay: 0.2s;
        }
        .bloco:nth-child(6) {
          animation-delay: 0.24s;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .bloco-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          cursor: pointer;
          user-select: none;
          transition: background 0.12s;
        }

        .bloco-header:hover {
          background: var(--bg3);
        }

        .bloco-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .bloco-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          flex-shrink: 0;
        }

        .bloco-titulo {
          font-size: 14px;
          font-weight: 600;
        }

        .bloco-desc {
          font-size: 11px;
          color: var(--muted);
          margin-top: 2px;
        }

        .bloco-right {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          flex-direction: column;
        }

        .bloco-total {
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          font-weight: 700;
          text-align: right;
          line-height: 1.2;
        }

        .bloco-progress {
          font-size: 10px;
          color: var(--muted);
          max-width: 170px;
          text-align: right;
        }

        .bloco-chevron {
          color: var(--muted);
          font-size: 11px;
          transition: transform 0.2s;
          align-self: flex-end;
        }

        .bloco.open .bloco-chevron {
          transform: rotate(180deg);
        }

        .bloco-body {
          display: none;
          border-top: 1px solid var(--border);
        }

        .bloco.open .bloco-body {
          display: block;
        }

        .cat-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 11px 20px;
          border-bottom: 1px solid var(--line-soft);
          transition: background 0.1s, border-color 0.2s;
        }

        .cat-row.is-realized {
          background: rgba(0, 200, 83, 0.06);
          border-color: rgba(0, 200, 83, 0.22);
        }

        .cat-row:hover {
          background: var(--bg3);
        }

        .cat-row:last-of-type {
          border-bottom: none;
        }

        .cat-nome {
          font-size: 13px;
          color: var(--dim);
        }

        .cat-nome.done {
          text-decoration: line-through;
          color: var(--muted);
        }

        .cat-main {
          flex: 1;
          min-width: 0;
        }

        .cat-meta {
          margin-top: 3px;
          font-size: 11px;
          color: var(--muted);
        }

        .cat-values {
          display: flex;
          gap: 8px;
          margin-top: 6px;
          flex-wrap: wrap;
        }

        .cat-input {
          background: var(--bg4);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text);
          font-family: 'Space Mono', monospace;
          font-size: 13px;
          padding: 7px 12px;
          width: 140px;
          text-align: right;
          outline: none;
          transition: border-color 0.15s;
        }

        .cat-input.realized {
          border-color: rgba(0, 200, 83, 0.45);
          color: var(--green);
          background: rgba(0, 200, 83, 0.08);
        }

        .cat-input:focus {
          border-color: var(--green);
          background: var(--bg3);
        }

        @media (max-width: 480px) {
          .cat-input {
            width: 110px;
            font-size: 12px;
          }
        }

        .cat-remove {
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          font-size: 15px;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.15s;
          flex-shrink: 0;
        }

        .cat-remove:hover {
          color: var(--red);
        }

        .cat-amount-btn {
          border: 1px solid var(--border);
          background: var(--bg4);
          color: var(--text);
          border-radius: 9px;
          padding: 7px 10px;
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          min-width: 122px;
          text-align: right;
        }

        .cat-amount-btn.realized {
          border-color: rgba(0, 200, 83, 0.42);
          color: var(--green);
          background: rgba(0, 200, 83, 0.1);
        }

        .row-check-wrap {
          width: 24px;
          height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-top: 6px;
          position: relative;
          flex-shrink: 0;
          cursor: pointer;
        }

        .row-check {
          position: absolute;
          opacity: 0;
          inset: 0;
          cursor: pointer;
          margin: 0;
        }

        .row-check-ui {
          width: 20px;
          height: 20px;
          border-radius: 999px;
          border: 2px solid var(--muted);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          color: transparent;
          transition: all 0.15s;
        }

        .row-check:checked + .row-check-ui {
          border-color: var(--green);
          background: var(--green);
          color: #05210e;
        }

        .add-row {
          display: flex;
          gap: 8px;
          padding: 11px 20px;
          background: var(--bg3);
          border-top: 1px solid var(--border);
        }

        .add-row-top {
          border-top: 0;
          border-bottom: 1px solid var(--border);
        }

        .add-input {
          flex: 1;
          background: var(--bg4);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text);
          font-family: 'Sora', sans-serif;
          font-size: 12px;
          padding: 8px 12px;
          outline: none;
        }

        .add-input:focus {
          border-color: var(--green);
        }

        .add-input::placeholder {
          color: var(--muted);
        }

        .add-btn {
          background: var(--green-dim);
          border: 1px solid var(--green);
          color: var(--green);
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          padding: 8px 14px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .add-btn:hover {
          background: var(--green);
          color: #000;
        }

        .grupo {
          border-bottom: 1px solid var(--border2);
        }

        .grupo:last-child {
          border-bottom: none;
        }

        .grupo-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          cursor: pointer;
          user-select: none;
          transition: background 0.1s;
        }

        .grupo-header:hover {
          background: var(--hover-soft);
        }

        .grupo-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .grupo-arrow {
          font-size: 10px;
          color: var(--muted);
          transition: transform 0.2s;
          flex-shrink: 0;
        }

        .grupo.gopen .grupo-arrow {
          transform: rotate(90deg);
        }

        .grupo-nome {
          font-size: 13px;
          font-weight: 600;
          color: var(--dim);
        }

        .grupo-right {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .grupo-total {
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          color: var(--dim);
          min-width: 120px;
          text-align: right;
          line-height: 1.2;
        }

        .grupo-remove-btn {
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          font-size: 14px;
          padding: 3px 5px;
          border-radius: 4px;
          transition: color 0.15s;
        }

        .grupo-remove-btn:hover {
          color: var(--red);
        }

        .grupo-body {
          display: none;
        }

        .grupo.gopen .grupo-body {
          display: block;
        }

        .subcat-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 20px 9px 46px;
          border-bottom: 1px solid var(--line-softer);
          transition: background 0.1s, border-color 0.2s;
        }

        .subcat-row.is-realized {
          background: rgba(0, 200, 83, 0.05);
          border-color: rgba(0, 200, 83, 0.2);
        }

        .subcat-row:hover {
          background: var(--hover-softer);
        }

        .subcat-row:last-of-type {
          border-bottom: none;
        }

        .subcat-nome {
          font-size: 12px;
          color: var(--muted);
        }

        .subcat-nome.done {
          text-decoration: line-through;
        }

        .subcat-main {
          flex: 1;
          min-width: 0;
        }

        .subcat-meta {
          margin-top: 2px;
          font-size: 11px;
          color: var(--muted);
        }

        .subcat-values {
          display: flex;
          gap: 8px;
          margin-top: 5px;
          flex-wrap: wrap;
        }

        .subcat-input {
          background: var(--bg4);
          border: 1px solid var(--border);
          border-radius: 7px;
          color: var(--text);
          font-family: 'Space Mono', monospace;
          font-size: 12px;
          padding: 6px 10px;
          width: 130px;
          text-align: right;
          outline: none;
          transition: border-color 0.15s;
        }

        .subcat-input.realized {
          border-color: rgba(0, 200, 83, 0.45);
          color: var(--green);
          background: rgba(0, 200, 83, 0.08);
        }

        .subcat-input:focus {
          border-color: rgba(255, 68, 68, 0.45);
          background: var(--bg3);
        }

        @media (max-width: 480px) {
          .subcat-input {
            width: 100px;
            font-size: 11px;
          }
        }

        .subcat-remove {
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          font-size: 13px;
          padding: 3px;
          border-radius: 4px;
          transition: color 0.15s;
          flex-shrink: 0;
        }

        .subcat-remove:hover {
          color: var(--red);
        }

        .subcat-amount-btn {
          border: 1px solid var(--border);
          background: var(--bg4);
          color: var(--text);
          border-radius: 8px;
          padding: 6px 9px;
          font-family: 'Space Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          min-width: 110px;
          text-align: right;
        }

        .subcat-amount-btn.realized {
          border-color: rgba(0, 200, 83, 0.42);
          color: var(--green);
          background: rgba(0, 200, 83, 0.1);
        }

        .add-subcat-row {
          display: flex;
          gap: 8px;
          padding: 8px 16px 8px 46px;
          background: rgba(255, 68, 68, 0.025);
          border-top: 1px solid rgba(255, 68, 68, 0.06);
        }

        .add-subcat-row-top {
          border-top: 0;
          border-bottom: 1px solid rgba(255, 68, 68, 0.08);
        }

        .add-subcat-input {
          flex: 1;
          background: var(--bg4);
          border: 1px solid var(--border);
          border-radius: 7px;
          color: var(--text);
          font-family: 'Sora', sans-serif;
          font-size: 11px;
          padding: 7px 10px;
          outline: none;
        }

        .add-subcat-input:focus {
          border-color: rgba(255, 68, 68, 0.35);
        }

        .add-subcat-input::placeholder {
          color: var(--muted);
        }

        .add-subcat-btn {
          background: rgba(255, 68, 68, 0.08);
          border: 1px solid rgba(255, 68, 68, 0.25);
          color: var(--red);
          border-radius: 7px;
          font-size: 11px;
          font-weight: 600;
          padding: 7px 12px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .add-subcat-btn:hover {
          background: var(--red);
          color: #fff;
        }

        .add-grupo-row {
          display: flex;
          gap: 8px;
          padding: 12px 20px;
          background: rgba(255, 68, 68, 0.03);
          border-top: 1px solid rgba(255, 68, 68, 0.07);
        }

        .add-grupo-row-top {
          border-top: 0;
          border-bottom: 1px solid rgba(255, 68, 68, 0.09);
        }

        .add-grupo-input {
          flex: 1;
          background: var(--bg4);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text);
          font-family: 'Sora', sans-serif;
          font-size: 12px;
          padding: 8px 12px;
          outline: none;
        }

        .add-grupo-input:focus {
          border-color: rgba(255, 68, 68, 0.35);
        }

        .add-grupo-input::placeholder {
          color: var(--muted);
        }

        .add-grupo-btn {
          background: rgba(255, 68, 68, 0.08);
          border: 1px solid rgba(255, 68, 68, 0.25);
          color: var(--red);
          border-radius: 8px;
          font-size: 12px;
          font-weight: 600;
          padding: 8px 14px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .add-grupo-btn:hover {
          background: var(--red);
          color: #fff;
        }

        .bloco[data-bloco='receitas'] .bloco-icon {
          background: rgba(0, 200, 83, 0.12);
        }

        .bloco[data-bloco='receitas'] .bloco-titulo,
        .bloco[data-bloco='receitas'] .bloco-total {
          color: var(--green);
        }

        .bloco[data-bloco='pagar-primeiro'] .bloco-icon {
          background: rgba(255, 215, 0, 0.1);
        }

        .bloco[data-bloco='pagar-primeiro'] .bloco-titulo,
        .bloco[data-bloco='pagar-primeiro'] .bloco-total {
          color: var(--gold);
        }

        .bloco[data-bloco='doar'] .bloco-icon {
          background: rgba(100, 180, 255, 0.1);
        }

        .bloco[data-bloco='doar'] .bloco-titulo,
        .bloco[data-bloco='doar'] .bloco-total {
          color: #64b4ff;
        }

        .bloco[data-bloco='contas'] .bloco-icon {
          background: rgba(255, 68, 68, 0.1);
        }

        .bloco[data-bloco='contas'] .bloco-titulo,
        .bloco[data-bloco='contas'] .bloco-total {
          color: var(--red);
        }

        .bloco[data-bloco='investimentos'] .bloco-icon {
          background: rgba(180, 100, 255, 0.1);
        }

        .bloco[data-bloco='investimentos'] .bloco-titulo,
        .bloco[data-bloco='investimentos'] .bloco-total {
          color: #b464ff;
        }

        .bloco[data-bloco='desfrute'] .bloco-icon {
          background: rgba(255, 140, 0, 0.1);
        }

        .bloco[data-bloco='desfrute'] .bloco-titulo,
        .bloco[data-bloco='desfrute'] .bloco-total {
          color: #ff8c00;
        }

        .perfil-section {
          margin-top: 14px;
          border: 1px solid var(--border);
          border-radius: 12px;
          background: var(--bg2);
          padding: 14px;
        }

        .perfil-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .perfil-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
        }

        .perfil-link {
          color: var(--green);
          text-decoration: none;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .perfil-copy {
          margin: 8px 0 10px;
          font-size: 12px;
          color: var(--muted);
        }

        .perfil-redeem-form {
          display: flex;
          gap: 8px;
        }

        .perfil-redeem-input {
          flex: 1;
          background: var(--bg4);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text);
          font-size: 12px;
          padding: 9px 11px;
          text-transform: uppercase;
          outline: none;
        }

        .perfil-redeem-input:focus {
          border-color: var(--green);
        }

        .perfil-redeem-btn {
          background: var(--green-dim);
          border: 1px solid var(--green);
          color: var(--green);
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
          padding: 9px 12px;
          cursor: pointer;
          white-space: nowrap;
        }

        .perfil-redeem-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .toast {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%) translateY(80px);
          background: var(--green);
          color: #000;
          font-size: 13px;
          font-weight: 600;
          padding: 10px 20px;
          border-radius: 10px;
          transition: transform 0.3s ease;
          z-index: 999;
          pointer-events: none;
        }

        .toast.show {
          transform: translateX(-50%) translateY(0);
        }

        .value-sheet-overlay {
          position: fixed;
          inset: 0;
          background: rgba(4, 6, 8, 0.68);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 12px;
          z-index: 998;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.18s;
        }

        .value-sheet-overlay.show {
          opacity: 1;
          pointer-events: auto;
        }

        .value-sheet {
          width: min(560px, 100%);
          border: 1px solid var(--border);
          background: var(--bg2);
          border-radius: 14px;
          padding: 14px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
        }

        .value-sheet-title {
          font-size: 16px;
          font-weight: 700;
        }

        .value-sheet-status {
          margin-top: 4px;
          font-size: 11px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .value-sheet-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: 12px;
        }

        .value-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .value-field span {
          font-size: 10px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .value-field input {
          background: var(--bg4);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text);
          font-family: 'Space Mono', monospace;
          font-size: 13px;
          padding: 8px 10px;
          outline: none;
          text-align: right;
        }

        .value-sheet-actions {
          margin-top: 12px;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }

        .btn-sheet {
          border: 0;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          background: var(--green);
          color: #04190d;
        }

        .btn-sheet-ghost {
          border: 1px solid var(--border);
          background: transparent;
          color: var(--dim);
        }

        @media (max-width: 560px) {
          .header {
            height: auto;
            padding: 8px 8px;
          }

          .header-right {
            gap: 6px;
            flex-wrap: wrap;
            justify-content: flex-end;
          }

          .brand-name {
            font-size: 12px;
          }

          .header-month {
            gap: 5px;
          }

          .month-select {
            font-size: 10px;
            padding: 5px 7px;
          }

          .theme-switch {
            padding: 2px;
          }

          .theme-btn {
            font-size: 9px;
            padding: 4px 7px;
          }

          .cat-row,
          .subcat-row {
            gap: 8px;
            padding-left: 12px;
            padding-right: 12px;
          }

          .subcat-row {
            padding-left: 28px;
          }

          .cat-amount-btn,
          .subcat-amount-btn {
            min-width: 94px;
            font-size: 11px;
            padding: 6px 8px;
          }

          .value-sheet-overlay {
            align-items: flex-end;
            padding: 0;
          }

          .value-sheet {
            width: 100%;
            border-radius: 16px 16px 0 0;
            border-left: 0;
            border-right: 0;
            border-bottom: 0;
            padding: 14px 12px max(14px, env(safe-area-inset-bottom));
          }

          .value-sheet-actions {
            gap: 6px;
          }

          .btn-sheet {
            flex: 1;
            text-align: center;
            padding: 10px 10px;
          }

          .value-sheet-grid {
            grid-template-columns: 1fr;
          }
        }

        .loading-screen {
          position: fixed;
          inset: 0;
          background: var(--bg);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          flex-direction: column;
          gap: 16px;
        }

        .loading-screen .spinner {
          width: 28px;
          height: 28px;
          border: 2px solid var(--border);
          border-top-color: var(--green);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .loading-screen p {
          font-size: 13px;
          color: var(--muted);
        }
      `}</style>
    </>
  );
}
