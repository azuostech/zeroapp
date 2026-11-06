import { z } from 'zod';
import { listMigrationCandidates, migrateAssets } from '@/src/modules/investments/application/investments-migration';
import { investmentsContext, errorResponse, json, parseBody, validationError } from '@/src/modules/investments/application/investments-api';

const inputSchema = z.object({ asset_ids: z.array(z.string().uuid()).min(1), goal_map: z.record(z.string(), z.string().uuid()).default({}) });
export async function GET(request) { const r = await investmentsContext({ request, requestedUserId: request.nextUrl.searchParams.get('user_id'), resource: 'investment_migration' }); if (r.response) return r.response; try { return json({ data: await listMigrationCandidates({ supabase: r.supabase, userId: r.context.targetUserId }) }); } catch (error) { return errorResponse(error); } }
export async function POST(request) { const body = await parseBody(request); const parsed = inputSchema.safeParse(body); if (!parsed.success) return validationError(parsed); const r = await investmentsContext({ request, requestedUserId: body?.user_id, resource: 'investment_migration', action: 'create' }); if (r.response) return r.response; try { return json({ data: await migrateAssets({ supabase: r.supabase, userId: r.context.targetUserId, assetIds: parsed.data.asset_ids, goalMap: parsed.data.goal_map }) }, 201); } catch (error) { return errorResponse(error); } }
