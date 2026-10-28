'use client';
import { useCallback, useEffect, useState } from 'react';

export function usePatrimony(endpoint, adminViewUserId = null) {
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const refresh = useCallback(async () => { setLoading(true); setError(''); try { const separator = endpoint.includes('?') ? '&' : '?'; const url = adminViewUserId ? `${endpoint}${separator}user_id=${encodeURIComponent(adminViewUserId)}` : endpoint; const response = await fetch(url, { cache: 'no-store' }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar'); setData(payload.data); } catch (reason) { setError(reason.message); } finally { setLoading(false); } }, [endpoint, adminViewUserId]);
  useEffect(() => { refresh(); }, [refresh]); return { data, loading, error, refresh };
}
export async function patrimonyMutation(url, options, userId) { const body = options?.body ? JSON.parse(options.body) : {}; const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers }, body: options?.body ? JSON.stringify(userId ? { ...body, user_id: userId } : body) : undefined }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Não foi possível salvar'); return payload; }
