import { NextResponse } from 'next/server';
import { isGoogleDriveImageUrl, normalizeGoogleDriveImageUrl } from '@/src/lib/drive-image-url';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function resolveDriveImageUrl(request) {
  const { searchParams } = new URL(request.url);
  const input = String(searchParams.get('url') || '').trim();
  if (!input) return null;

  const normalized = normalizeGoogleDriveImageUrl(input);
  if (!normalized || !isGoogleDriveImageUrl(normalized)) return null;
  return normalized;
}

export async function GET(request) {
  const targetUrl = resolveDriveImageUrl(request);
  if (!targetUrl) {
    return NextResponse.json({ error: 'invalid_drive_image_url' }, { status: 400 });
  }

  let upstream;
  try {
    upstream = await fetch(targetUrl, {
      method: 'GET',
      redirect: 'follow',
      cache: 'no-store'
    });
  } catch (_) {
    return NextResponse.json({ error: 'image_fetch_failed' }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: 'image_upstream_failed' }, { status: 502 });
  }

  const contentType = String(upstream.headers.get('content-type') || '').toLowerCase();
  if (!contentType.startsWith('image/')) {
    return NextResponse.json({ error: 'image_not_public_or_invalid_type' }, { status: 415 });
  }

  const contentLength = Number.parseInt(String(upstream.headers.get('content-length') || '0'), 10);
  if (!Number.isNaN(contentLength) && contentLength > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'image_too_large' }, { status: 413 });
  }

  const bytes = new Uint8Array(await upstream.arrayBuffer());
  if (bytes.length > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'image_too_large' }, { status: 413 });
  }

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(bytes.length),
      'Cache-Control': 'public, max-age=3600, s-maxage=3600'
    }
  });
}
