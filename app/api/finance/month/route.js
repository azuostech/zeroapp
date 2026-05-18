import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import {
  loadFinancialMonth,
  saveFinancialMonth,
  validateFinancialDataPayload,
  validateMonthYear
} from '@/src/modules/finance/application/finance-service';
import { normalizeFinancialData } from '@/src/modules/finance/domain/defaults';
import { resolveImpersonationContext } from '@/src/modules/admin/application/admin-impersonation-service';
import { recordAdminAudit } from '@/src/modules/admin/application/admin-audit-service';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { evaluateCoinsAfterToggle } from '@/src/modules/coins/application/coins-evaluator';

const SIMPLE_BLOCKS = new Set(['receitas', 'pagar-primeiro', 'doar', 'investimentos', 'desfrute']);

function parseBodySafe(request) {
  return request.json().catch(() => null);
}

function toMoneyString(value, fallback = '0') {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return fallback;
}

function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', 't', '1', 'yes', 'y', 'sim'].includes(normalized)) return true;
    if (['false', 'f', '0', 'no', 'n', 'nao', 'não'].includes(normalized)) return false;
  }
  return null;
}

function parseIndex(value) {
  const num = Number(value);
  if (!Number.isInteger(num) || num < 0) return null;
  return num;
}

function parseTogglePayload(body) {
  const bloco = String(body?.bloco || '').trim();
  if (!bloco) return { ok: false, error: 'invalid_bloco' };

  const realized = parseBoolean(body?.realized);
  if (realized === null) return { ok: false, error: 'invalid_realized' };

  const payload = {
    bloco,
    realized,
    itemIndex: parseIndex(body?.item_index),
    grupoIndex: parseIndex(body?.grupo_index),
    subcatIndex: parseIndex(body?.subcat_index),
    valorRealizado: body?.valor_realizado
  };

  if (bloco === 'contas') {
    if (payload.grupoIndex === null || payload.subcatIndex === null) {
      return { ok: false, error: 'invalid_contas_indices' };
    }
    return { ok: true, value: payload };
  }

  if (!SIMPLE_BLOCKS.has(bloco)) return { ok: false, error: 'invalid_bloco' };
  if (payload.itemIndex === null) return { ok: false, error: 'invalid_item_index' };

  return { ok: true, value: payload };
}

function applyToggleRealized(sourceData, togglePayload) {
  const data = normalizeFinancialData(sourceData);

  let target = null;

  if (togglePayload.bloco === 'contas') {
    const group = data.contas?.[togglePayload.grupoIndex];
    if (!group || !Array.isArray(group.subcats)) return null;
    target = group.subcats[togglePayload.subcatIndex];
  } else {
    const list = data[togglePayload.bloco];
    if (!Array.isArray(list)) return null;
    target = list[togglePayload.itemIndex];
  }

  if (!target || typeof target !== 'object') return null;

  const previsto = toMoneyString(target.valor_previsto ?? target.valor ?? '0', '0');
  const atualRealizado = toMoneyString(target.valor_realizado ?? '0', '0');
  const requestedRealizado = toMoneyString(togglePayload.valorRealizado, atualRealizado || previsto || '0');

  target.realized = togglePayload.realized;
  target.valor_previsto = previsto;
  target.valor = toMoneyString(target.valor ?? previsto, previsto);
  target.valor_realizado = togglePayload.realized ? requestedRealizado || previsto || '0' : '0';

  return data;
}

function getToggleTarget(sourceData, togglePayload) {
  const data = normalizeFinancialData(sourceData);

  if (togglePayload.bloco === 'contas') {
    return data?.contas?.[togglePayload.grupoIndex]?.subcats?.[togglePayload.subcatIndex] || null;
  }

  return data?.[togglePayload.bloco]?.[togglePayload.itemIndex] || null;
}

export async function GET(request) {
  const month = request.nextUrl.searchParams.get('month');
  const year = request.nextUrl.searchParams.get('year');
  const requestedUserId = request.nextUrl.searchParams.get('user_id');

  if (!validateMonthYear(month, year)) {
    return NextResponse.json({ error: 'invalid_month_or_year' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const context = await resolveImpersonationContext({
    supabase,
    requestedUserId
  });

  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!context.isAdmin && context.profile.status !== 'active') {
    return NextResponse.json({ error: 'inactive_account' }, { status: 403 });
  }

  try {
    const data = await loadFinancialMonth({
      supabase,
      userId: context.targetUserId,
      month,
      year
    });
    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const body = await parseBodySafe(request);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_json_body' }, { status: 400 });
  }

  const { month, year, data, action, user_id: requestedUserId } = body;

  if (!validateMonthYear(month, year)) {
    return NextResponse.json({ error: 'invalid_month_or_year' }, { status: 400 });
  }

  const supabase = await createServerSupabase();
  const context = await resolveImpersonationContext({
    supabase,
    requestedUserId
  });

  if (!context.ok) return NextResponse.json({ error: context.error }, { status: context.status });
  if (!context.isAdmin && context.profile.status !== 'active') {
    return NextResponse.json({ error: 'inactive_account' }, { status: 403 });
  }

  try {
    if (action === 'toggle_realized') {
      const parsedToggle = parseTogglePayload(body);
      if (!parsedToggle.ok) {
        return NextResponse.json({ error: parsedToggle.error }, { status: 400 });
      }

      const rawData = body?.data;
      const hasInlineData = rawData && typeof rawData === 'object' && !Array.isArray(rawData);

      let currentData;
      if (hasInlineData) {
        currentData = normalizeFinancialData(rawData);
        const validationError = validateFinancialDataPayload(currentData);
        if (validationError) {
          return NextResponse.json({ error: 'invalid_toggle_source_data', details: validationError }, { status: 400 });
        }
      } else {
        currentData = await loadFinancialMonth({
          supabase,
          userId: context.targetUserId,
          month,
          year
        });
      }

      const targetBefore = getToggleTarget(currentData, parsedToggle.value);
      const wasRealized = Boolean(targetBefore?.realized);
      const isNowRealized = Boolean(parsedToggle.value.realized);

      const toggledData = applyToggleRealized(currentData, parsedToggle.value);
      if (!toggledData) {
        return NextResponse.json({ error: 'target_item_not_found' }, { status: 404 });
      }

      await saveFinancialMonth({
        supabase,
        userId: context.targetUserId,
        month,
        year,
        data: toggledData
      });

      let coinsAwarded = [];
      let coinsBalance = null;
      let coinsWarning = null;

      if (!context.isAdmin && !context.impersonating) {
        try {
          const serviceSupabase = getServiceSupabase();
          const coinsResult = await evaluateCoinsAfterToggle({
            supabase: serviceSupabase,
            userId: context.targetUserId,
            month,
            year,
            data: toggledData,
            toggleContext: parsedToggle.value,
            wasRealized,
            isNowRealized
          });

          coinsAwarded = (coinsResult?.awards || []).map((award) => ({
            action_type: award.action_type,
            amount: award.amount,
            description: award.description
          }));
          coinsBalance = coinsResult?.balance || null;
        } catch (coinsError) {
          coinsWarning = coinsError.message || 'coins_evaluation_failed';
        }
      }

      if (context.impersonating) {
        await recordAdminAudit({
          supabase,
          adminUserId: context.user.id,
          targetUserId: context.targetUserId,
          action: 'update',
          resource: 'financial_item_toggle',
          resourceId: `${year}-${month}`,
          metadata: {
            month,
            year,
            bloco: parsedToggle.value.bloco,
            item_index: parsedToggle.value.itemIndex,
            grupo_index: parsedToggle.value.grupoIndex,
            subcat_index: parsedToggle.value.subcatIndex,
            realized: parsedToggle.value.realized
          }
        });
      }

      return NextResponse.json({
        success: true,
        ok: true,
        data: toggledData,
        coins_awarded: coinsAwarded,
        coins_balance: coinsBalance,
        coins_warning: coinsWarning
      });
    }

    if (action) {
      return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
    }

    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return NextResponse.json({ error: 'invalid_data_payload' }, { status: 400 });
    }

    const normalized = normalizeFinancialData(data);
    const validationError = validateFinancialDataPayload(normalized);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await saveFinancialMonth({
      supabase,
      userId: context.targetUserId,
      month,
      year,
      data: normalized
    });

    if (context.impersonating) {
      await recordAdminAudit({
        supabase,
        adminUserId: context.user.id,
        targetUserId: context.targetUserId,
        action: 'update',
        resource: 'financial_month',
        resourceId: `${year}-${month}`,
        metadata: { month, year }
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
