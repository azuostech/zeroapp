const DRIVE_HOSTS = new Set(['drive.google.com', 'docs.google.com', 'drive.usercontent.google.com']);

function normalizeHost(hostname) {
  return String(hostname || '').toLowerCase().replace(/^www\./, '');
}

function isDriveHost(hostname) {
  return DRIVE_HOSTS.has(normalizeHost(hostname));
}

function extractDriveFileId(url) {
  const host = normalizeHost(url.hostname);
  const path = String(url.pathname || '');

  if (!isDriveHost(host)) return null;

  const fromPath = path.match(/\/file\/d\/([^/]+)/);
  if (fromPath?.[1]) return fromPath[1];

  const fromQuery = url.searchParams.get('id');
  if (fromQuery) return fromQuery;

  return null;
}

export function normalizeGoogleDriveImageUrl(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';

  try {
    const url = new URL(normalized);
    const fileId = extractDriveFileId(url);
    if (!fileId) return normalized;

    const direct = new URL('https://drive.google.com/uc');
    direct.searchParams.set('export', 'view');
    direct.searchParams.set('id', fileId);

    const resourceKey = url.searchParams.get('resourcekey');
    if (resourceKey) {
      direct.searchParams.set('resourcekey', resourceKey);
    }

    return direct.toString();
  } catch (_) {
    return normalized;
  }
}

export function isGoogleDriveImageUrl(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return false;

  try {
    const url = new URL(normalized);
    return isDriveHost(url.hostname);
  } catch (_) {
    return false;
  }
}

export function resolveImageUrlForDisplay(value) {
  const normalized = normalizeGoogleDriveImageUrl(value);
  if (!normalized) return '';
  if (!isGoogleDriveImageUrl(normalized)) return normalized;
  return `/api/media/image-proxy?url=${encodeURIComponent(normalized)}`;
}
