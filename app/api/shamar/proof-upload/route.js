import { NextResponse } from 'next/server';
import {
  PROOF_ALLOWED_CONTENT_TYPES,
  createAuthenticatedContext,
  jsonError,
  loadShamarProfile,
  parseJsonBody,
  sanitizeFilename
} from '@/src/lib/shamar/api';

export async function POST(request) {
  const context = await createAuthenticatedContext();
  if (context.error) return context.error;

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const { profile, error: profileError } = await loadShamarProfile(context.supabase, context.user.id);
  if (profileError) {
    return NextResponse.json({ error: profileError }, { status: 500 });
  }

  if (!profile?.shamar_unlocked) {
    return jsonError('shamar_bloqueado_para_usuario', 403);
  }

  const filename = sanitizeFilename(parsed.body?.filename);
  const contentType = String(parsed.body?.content_type || '').trim().toLowerCase();

  if (!PROOF_ALLOWED_CONTENT_TYPES.has(contentType)) {
    return jsonError('content_type_invalido', 422, {
      allowed_content_types: [...PROOF_ALLOWED_CONTENT_TYPES]
    });
  }

  const path = `${context.user.id}/${Date.now()}_${filename}`;

  const { data, error } = await context.supabase.storage
    .from('shamar-provas')
    .createSignedUploadUrl(path);

  if (error) {
    return NextResponse.json({ error: error.message || 'signed_upload_url_failed' }, { status: 500 });
  }

  return NextResponse.json({
    upload_url: data.signedUrl,
    token: data.token,
    path,
    content_type: contentType
  });
}
