'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

function previousMonthInputValue() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  if (month === 0) {
    return `${year - 1}-12`;
  }

  return `${year}-${String(month).padStart(2, '0')}`;
}

function splitYearMonth(value) {
  const [yearRaw, monthRaw] = String(value || '').split('-');
  const year = Number(yearRaw);
  const month = Number(monthRaw);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return {
    ano: String(year),
    mes: String(month).padStart(2, '0')
  };
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    cache: 'no-store'
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new Error(payload?.error || payload?.details || 'request_failed');
  }

  return payload;
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

export default function AdminEmailPage() {
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logs, setLogs] = useState([]);
  const [monthlyPeriod, setMonthlyPeriod] = useState(previousMonthInputValue);
  const [monthlyUserId, setMonthlyUserId] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [sendingMonthly, setSendingMonthly] = useState(false);
  const [testResult, setTestResult] = useState('');
  const [monthlyResult, setMonthlyResult] = useState('');
  const [error, setError] = useState('');

  const canSendMonthly = useMemo(() => Boolean(splitYearMonth(monthlyPeriod)), [monthlyPeriod]);

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const payload = await requestJson('/api/email/logs?limit=50');
      setLogs(Array.isArray(payload?.logs) ? payload.logs : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar logs');
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleSendTest = useCallback(async () => {
    setSendingTest(true);
    setError('');
    setTestResult('');

    try {
      const payload = await requestJson('/api/email/test', {
        method: 'POST',
        body: JSON.stringify({})
      });

      if (payload?.success) {
        setTestResult('✓ Email de teste enviado com sucesso.');
      } else {
        setTestResult(`Falha no envio de teste: ${payload?.error || 'erro desconhecido'}`);
      }

      await loadLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar email de teste');
    } finally {
      setSendingTest(false);
    }
  }, [loadLogs]);

  const handleSendMonthly = useCallback(async () => {
    const period = splitYearMonth(monthlyPeriod);
    if (!period) {
      setError('Periodo invalido. Use MM/AAAA.');
      return;
    }

    setSendingMonthly(true);
    setError('');
    setMonthlyResult('');

    try {
      const payload = await requestJson('/api/email/monthly', {
        method: 'POST',
        body: JSON.stringify({
          mes: period.mes,
          ano: period.ano,
          user_id: monthlyUserId.trim() || undefined
        })
      });

      setMonthlyResult(`✓ ${payload?.sent || 0} email(s) enviados. ${payload?.failed || 0} falharam. ${payload?.skipped || 0} ignorados.`);
      await loadLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao disparar relatorio mensal');
    } finally {
      setSendingMonthly(false);
    }
  }, [loadLogs, monthlyPeriod, monthlyUserId]);

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-[#fff] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Envio de Emails</h1>
          <p className="text-[#888]">Painel de disparo e auditoria de emails da Etapa 5.</p>
        </div>

        {error ? (
          <div className="mb-6 bg-[rgba(244,67,54,0.12)] border border-[rgba(244,67,54,0.35)] text-[#ff8d8d] rounded-[10px] p-3 text-sm">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <section className="bg-[#222222] border border-[#333333] rounded-[12px] p-5">
            <h2 className="text-lg font-semibold mb-2">Teste de Email</h2>
            <p className="text-sm text-[#8f8f8f] mb-4">Envia um email de teste para o administrador logado.</p>

            <button
              onClick={handleSendTest}
              disabled={sendingTest}
              className="bg-[#00C853] text-[#000] font-bold px-4 py-2 rounded-[8px] disabled:opacity-50"
            >
              {sendingTest ? 'Enviando...' : 'Enviar email de teste para mim'}
            </button>

            {testResult ? <p className="text-sm mt-3 text-[#c7f7d3]">{testResult}</p> : null}
          </section>

          <section className="bg-[#222222] border border-[#333333] rounded-[12px] p-5">
            <h2 className="text-lg font-semibold mb-2">Relatorio Mensal</h2>
            <p className="text-sm text-[#8f8f8f] mb-4">Dispara email para um usuario especifico ou para todos os ativos.</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-[1px] text-[#9a9a9a] block mb-1">Mes de referencia</label>
                <input
                  type="month"
                  value={monthlyPeriod}
                  onChange={(event) => setMonthlyPeriod(event.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#3b3b3b] rounded-[8px] px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-[1px] text-[#9a9a9a] block mb-1">User ID (opcional)</label>
                <input
                  type="text"
                  value={monthlyUserId}
                  onChange={(event) => setMonthlyUserId(event.target.value)}
                  placeholder="vazio = todos os ativos"
                  className="w-full bg-[#1a1a1a] border border-[#3b3b3b] rounded-[8px] px-3 py-2 text-sm"
                />
              </div>

              <button
                onClick={handleSendMonthly}
                disabled={sendingMonthly || !canSendMonthly}
                className="bg-[#FFD700] text-[#111] font-bold px-4 py-2 rounded-[8px] disabled:opacity-50"
              >
                {sendingMonthly ? 'Disparando...' : 'Disparar relatorio'}
              </button>
            </div>

            {monthlyResult ? <p className="text-sm mt-3 text-[#ffe9a8]">{monthlyResult}</p> : null}
          </section>
        </div>

        <section className="bg-[#222222] border border-[#333333] rounded-[12px] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#333333] flex items-center justify-between">
            <h2 className="text-lg font-semibold">Log de Emails</h2>
            <button
              onClick={loadLogs}
              className="text-xs uppercase tracking-[1px] text-[#8ad6a2] border border-[#2e5d3e] px-3 py-1 rounded-[6px]"
            >
              Atualizar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px]">
              <thead className="bg-[#1d1d1d] text-[#8f8f8f] text-xs uppercase tracking-[1px]">
                <tr>
                  <th className="text-left px-4 py-3">Data</th>
                  <th className="text-left px-4 py-3">Tipo</th>
                  <th className="text-left px-4 py-3">Destinatario</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Assunto</th>
                </tr>
              </thead>
              <tbody>
                {loadingLogs ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-[#9a9a9a]">
                      Carregando logs...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-[#9a9a9a]">
                      Nenhum log encontrado.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-t border-[#2e2e2e]">
                      <td className="px-4 py-3 text-sm text-[#d6d6d6]">{formatDateTime(log.sent_at)}</td>
                      <td className="px-4 py-3 text-sm text-[#b8b8b8]">{log.email_type}</td>
                      <td className="px-4 py-3 text-sm text-[#b8b8b8]">{log.recipient}</td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 rounded-[999px] border text-xs ${
                            log.status === 'sent'
                              ? 'text-[#8ff0af] border-[rgba(0,200,83,0.35)] bg-[rgba(0,200,83,0.1)]'
                              : 'text-[#ffb3b3] border-[rgba(244,67,54,0.35)] bg-[rgba(244,67,54,0.1)]'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#dcdcdc]">{log.subject}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
