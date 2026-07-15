import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createAuthenticatedContext, jsonError, parseJsonBody } from '@/src/lib/shamar/api';
import { getServiceSupabase } from '@/src/lib/supabase/service';

export const runtime = 'nodejs';

const MAX_PROOF_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ['image/jpeg', { extension: 'jpg', filenameExtensions: new Set(['jpg', 'jpeg']) }],
  ['image/png', { extension: 'png', filenameExtensions: new Set(['png']) }],
  ['image/webp', { extension: 'webp', filenameExtensions: new Set(['webp']) }]
]);

function filenameExtension(filename) {
  const match = String(filename || '').trim().toLowerCase().match(/\.([a-z0-9]+)$/);
  return match?.[1] || '';
}

function detectImageType(bytes) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { contentType: 'image/png', extension: 'png' };
  }

  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { contentType: 'image/jpeg', extension: 'jpg' };
  }

  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { contentType: 'image/webp', extension: 'webp' };
  }

  return null;
}

function isOwnedPendingPath(path, userId) {
  return new RegExp(`^${userId}/pending/[0-9a-f-]{36}\\.upload$`, 'i').test(String(path || ''));
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
  const typeConfig = ALLOWED_TYPES.get(contentType);
  const extension = filenameExtension(body?.filename);

  if (!typeConfig || !typeConfig.filenameExtensions.has(extension)) {
    return jsonError('arquivo_invalido', 422, {
      allowed_content_types: [...ALLOWED_TYPES.keys()],
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

  if (!isOwnedPendingPath(pendingPath, context.user.id) || !ALLOWED_TYPES.has(declaredType)) {
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
  const detected = detectImageType(bytes);
  if (!detected || detected.contentType !== declaredType) {
    await removePendingObject(pendingPath);
    return jsonError('assinatura_de_arquivo_invalida', 422);
  }

  const objectId = pendingPath.split('/').pop().replace(/\.upload$/i, '');
  const finalPath = `${context.user.id}/proofs/${objectId}.${detected.extension}`;
  const serviceSupabase = getServiceSupabase();
  const { error: moveError } = await serviceSupabase.storage
    .from('shamar-provas')
    .move(pendingPath, finalPath);

  if (moveError) {
    return NextResponse.json({ error: moveError.message || 'proof_finalize_failed' }, { status: 500 });
  }

  return NextResponse.json({
    path: finalPath,
    content_type: detected.contentType,
    size: file.size
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
