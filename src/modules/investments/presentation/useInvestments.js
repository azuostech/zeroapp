'use client';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

export function withInvestmentUser(endpoint, userId) {
  if (!userId) return endpoint;
  const separator = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${separator}user_id=${encodeURIComponent(userId)}`;
}

export function useInvestments(endpoint, adminViewUserId = null) {
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try { const response = await fetch(withInvestmentUser(endpoint, adminViewUserId), { cache: 'no-store' }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Não foi possível carregar'); setData(payload.data); }
    catch (reason) { setError(reason.message); }
    finally { setLoading(false); }
  }, [endpoint, adminViewUserId]);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { const update = () => refresh(); window.addEventListener('zero:coins-updated', update); return () => window.removeEventListener('zero:coins-updated', update); }, [refresh]);
  return { data, loading, error, refresh };
}

export async function investmentsMutation(url, options = {}, userId = null) {
  const body = options.body ? JSON.parse(options.body) : {};
  const response = await fetch(url, { ...options, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...options.headers }, body: options.body ? JSON.stringify(userId ? { ...body, user_id: userId } : body) : undefined });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Não foi possível salvar');
  const coins = payload.data?.coins;
  if (coins?.awarded?.length) { const total = coins.awarded.reduce((sum, item) => sum + Number(item.amount || 0), 0); toast.success(`+${total} ZeroCoins`); window.dispatchEvent(new CustomEvent('zero:coins-updated', { detail: coins.balance })); }
  return payload.data;
}
