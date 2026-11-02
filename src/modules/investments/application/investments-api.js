import { errorResponse, json, parseBody, routeContext } from '@/src/modules/patrimony/application/patrimony-api';
import { ensureDefaults } from './investments-service';
export { errorResponse, json, parseBody };
export async function investmentsContext(args) { const resolved = await routeContext(args); if (!resolved.response) await ensureDefaults({ supabase: resolved.supabase, userId: resolved.context.targetUserId }); return resolved; }
export const validationError = (parsed) => json({ error: 'validation_error', details: parsed.error.flatten() }, 400);
