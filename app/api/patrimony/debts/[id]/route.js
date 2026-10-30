import { debtInputSchema } from '@/src/modules/patrimony/domain/patrimony.validation';
import {
  archiveDebt,
  confirmEntity,
  getChangeHistory,
  getDebt,
  updateDebt
} from '@/src/modules/patrimony/application/patrimony-service';
import {
  cheaperReferenceRate,
  debtProgress,
  monthlyToAnnualRate,
  payoffSimulation,
  prioritizeDebts
} from '@/src/modules/patrimony/domain/patrimony.calculations';
import { routeContext, json, errorResponse, parseBody } from '@/src/modules/patrimony/application/patrimony-api';

async function context(request, id, body, action = 'read') {
  return routeContext({
    request,
    requestedUserId: body?.user_id || request.nextUrl.searchParams.get('user_id'),
    resource: 'patrimony_debt',
    action,
    resourceId: id
  });
}

export async function GET(request, { params }) {
  const { id } = await params;
  const resolved = await context(request, id);
  if (resolved.response) return resolved.response;

  try {
    const { supabase, context: ctx } = resolved;
    const debt = await getDebt({ supabase, userId: ctx.targetUserId, id });
    if (!debt) return json({ error: 'not_found' }, 404);

    const [{ data: milestones }, allDebts, history] = await Promise.all([
      supabase
        .from('patrimony_milestones')
        .select('label,milestone_date,snapshot')
        .eq('user_id', ctx.targetUserId)
        .order('sequence'),
      supabase.from('patrimony_debts').select('*').eq('user_id', ctx.targetUserId).is('archived_at', null),
      getChangeHistory({ supabase, entityId: id })
    ]);
    if (allDebts.error) throw allDebts.error;

    const debtHistory = (milestones || [])
      .map((item) => ({
        label: item.label,
        date: item.milestone_date,
        balance: item.snapshot?.debts?.find((entry) => entry.id === id)?.current_balance
      }))
      .filter((item) => item.balance != null);
    const debts = allDebts.data || [];
    const reference = cheaperReferenceRate(debts, debt);

    return json({
      data: {
        ...debt,
        priority: prioritizeDebts(debts).find((item) => item.id === id)?.priority,
        progress: debtProgress(debt, milestones?.[0]?.snapshot?.debts?.find((item) => item.id === id)),
        annualRate: monthlyToAnnualRate(debt.interest_rate_monthly),
        history: debtHistory,
        changes: history,
        payoff: payoffSimulation({
          balance: debt.current_balance,
          monthlyRatePct: debt.interest_rate_monthly,
          monthlyPayment: debt.monthly_payment || debt.installment_amount
        }),
        simulation: reference == null ? null : {
          rate: reference,
          ...payoffSimulation({
            balance: debt.current_balance,
            monthlyRatePct: reference,
            monthlyPayment: debt.monthly_payment || debt.installment_amount
          })
        }
      }
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await parseBody(request);
  if (!body) return json({ error: 'invalid_json_body' }, 400);
  const resolved = await context(request, id, body, 'update');
  if (resolved.response) return resolved.response;

  try {
    const { supabase, context: ctx } = resolved;
    if (body.confirm) {
      return json({
        data: await confirmEntity({
          supabase,
          entityType: 'debt',
          id,
          userId: ctx.targetUserId,
          actorId: ctx.user.id,
          actorRole: ctx.actorRole
        })
      });
    }
    const debt = await getDebt({ supabase, userId: ctx.targetUserId, id });
    if (!debt) return json({ error: 'not_found' }, 404);
    const parsed = debtInputSchema.safeParse({
      ...debt,
      ...body,
      interest_rate: body.interest_rate ?? debt.interest_rate_monthly,
      interest_rate_period: body.interest_rate_period || 'am'
    });
    if (!parsed.success) return json({ error: 'validation_error', details: parsed.error.flatten() }, 400);
    return json({
      data: await updateDebt({
        supabase,
        id,
        userId: ctx.targetUserId,
        input: parsed.data,
        actorId: ctx.user.id,
        actorRole: ctx.actorRole
      })
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const resolved = await context(request, id, null, 'archive');
  if (resolved.response) return resolved.response;
  try {
    const { supabase, context: ctx } = resolved;
    return json({
      data: await archiveDebt({
        supabase,
        id,
        userId: ctx.targetUserId,
        actorId: ctx.user.id,
        actorRole: ctx.actorRole
      })
    });
  } catch (error) {
    return errorResponse(error);
  }
}
