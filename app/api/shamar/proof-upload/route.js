import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAuthenticatedContext, jsonError, parseJsonBody } from '@/src/lib/shamar/api';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import {
  ALLOWED_PROOF_TYPES,
  MAX_PROOF_BYTES,
  detectProofImageType,
  isOwnedPendingProofPath
} from '@/src/lib/shamar/proof-files';

export const runtime = 'nodejs';

function filenameExtension(filename) {
  const match = String(filename || '').trim().toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || '';
}

async function removePendingObject(path) {
  try {
    const serviceSupabase = getServiceSupabase();
    await serviceSupabase.storage.from('shamar-provas').remove([path]);
  } catch (error) {
    console.error('[proof-upload] pending cleanup failed:', error?.message || error);
  }
}

async function createUpload(context, body) {
  const contentType = String(body?.content_type || '').trim().toLowerCase();
  const typeConfig = ALLOWED_PROOF_TYPES.get(contentType);
  const extension = filenameExtension(body?.filename);

  if (!typeConfig || !typeConfig.filenameExtensions.has(extension)) {
    return jsonError('arquivo_invalido', 422, {
      allowed_content_types: [...ALLOWED_PROOF_TYPES.keys()],
      allowed_extensions: ['jpg', 'jpeg', 'png', 'webp']
    });
  }

  const path = `${context.user.id}/pending/${randomUUID()}.upload`;
  const { data, error } = await context.supabase.storage
    .from('shamar-provas')
    .createSignedUploadUrl(path);

  if (error) {
    return NextResponse.json({ error: error.message || 'signed_upload_url_failed' }, { status: 500 });
  }

  return NextResponse.json({
    token: data.token,
    path,
    content_type: contentType,
    max_bytes: MAX_PROOF_BYTES
  });
}

async function finalizeUpload(context, body) {
  const pendingPath = String(body?.path || '').trim();
  const declaredType = String(body?.content_type || '').trim().toLowerCase();

  if (!isOwnedPendingProofPath(pendingPath, context.user.id) || !ALLOWED_PROOF_TYPES.has(declaredType)) {
    return jsonError('upload_pendente_invalido', 422);
  }

  const { data: file, error: downloadError } = await context.supabase.storage
    .from('shamar-provas')
    .download(pendingPath);

  if (downloadError || !file) {
    return NextResponse.json({ error: downloadError?.message || 'proof_download_failed' }, { status: 422 });
  }

  if (file.size <= 0 || file.size > MAX_PROOF_BYTES) {
    await removePendingObject(pendingPath);
    return jsonError('tamanho_de_arquivo_invalido', 413, { max_bytes: MAX_PROOF_BYTES });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const detected = detectProofImageType(bytes);
  if (!detected || detected.contentType !== declaredType) {
    await removePendingObject(pendingPath);
    return jsonError('assinatura_de_arquivo_invalida', 422);
  }

  const objectId = pendingPath.split('/').pop().replace(/\.upload$/i, '');
  const finalPath = `${context.user.id}/proofs/${objectId}.${detected.extension}`;
  let storedPath = pendingPath;

  try {
    const serviceSupabase = getServiceSupabase();
    const { error: moveError } = await serviceSupabase.storage
      .from('shamar-provas')
      .move(pendingPath, finalPath);

    if (moveError) throw moveError;
    storedPath = finalPath;
  } catch (error) {
    // O arquivo em pending continua privado e sera validado novamente no POST
    // do aporte. Isso mantem o fluxo funcional sem enfraquecer a validacao.
    console.warn('[proof-upload] keeping validated pending object:', error?.message || error);
  }

  return NextResponse.json({
    path: storedPath,
    content_type: detected.contentType,
    size: file.size,
    finalized: storedPath === finalPath
  });
}

export async function POST(request) {
  const context = await createAuthenticatedContext();
  if (context.error) return context.error;

  const parsed = await parseJsonBody(request);
  if (parsed.error) return parsed.error;

  const action = String(parsed.body?.action || 'create').trim().toLowerCase();
  if (action === 'create') return createUpload(context, parsed.body);
  if (action === 'finalize') return finalizeUpload(context, parsed.body);
  return jsonError('acao_invalida', 422);
}
