import 'server-only';

export const MAX_PROOF_BYTES = 10 * 1024 * 1024;

export const ALLOWED_PROOF_TYPES = new Map([
  ['image/jpeg', { extension: 'jpg', filenameExtensions: new Set(['jpg', 'jpeg']) }],
  ['image/png', { extension: 'png', filenameExtensions: new Set(['png']) }],
  ['image/webp', { extension: 'webp', filenameExtensions: new Set(['webp']) }]
]);

export function detectProofImageType(bytes) {
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

export function isOwnedPendingProofPath(path, userId) {
  return new RegExp(`^${userId}/pending/[0-9a-f-]{36}\\.upload$`, 'i').test(String(path || ''));
}

export function isOwnedFinalProofPath(path, userId) {
  return new RegExp(`^${userId}/proofs/[0-9a-f-]{36}\\.(?:jpg|png|webp)$`, 'i').test(String(path || ''));
}
