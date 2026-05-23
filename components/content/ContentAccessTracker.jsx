'use client';

import { useEffect } from 'react';

export default function ContentAccessTracker({ contentId }) {
  useEffect(() => {
    const id = String(contentId || '').trim();
    if (!id) return;

    fetch(`/api/content/${id}/access`, {
      method: 'POST',
      cache: 'no-store'
    }).catch(() => {
      // no-op
    });
  }, [contentId]);

  return null;
}
