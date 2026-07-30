'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import IrcReport from './IrcReport';
import styles from '@/app/diagnostico-completo/styles.module.css';

const opening = [
  'Este diagnóstico vai além do que aparece no seu extrato. Vamos identificar as crenças, emoções e comportamentos que influenciam a sua relação com o dinheiro.',
  'São 6 temas e 12 respostas objetivas. Não existe resposta certa — existe a resposta que mais se parece com você hoje.'
];

function message(sender, text, key) {
  return { sender, text, key };
}

function reconstructMessages(payload) {
  const result = opening.map((text, index) => message('bot', text, `opening-${index}`));
  const { diagnostic, domains, profile } = payload;
  result.push(message('bot', `${profile.first_name}, vamos começar pela origem da sua relação com o dinheiro.`, 'welcome'));

  domains.forEach((domain, index) => {
    const stored = diagnostic.answers?.[domain.id];
    if (!stored && index > diagnostic.current_domain) return;
    if (index > 0 && (stored || index === diagnostic.current_domain)) {
      result.push(message('bot', `Agora vamos olhar para ${domain.title.toLocaleLowerCase('pt-BR')}.`, `transition-${domain.id}`));
    }
    if (stored || index === diagnostic.current_domain) {
      result.push(message('bot', domain.entryQuestion, `entry-question-${domain.id}`));
    }
    const entry = domain.options.find((candidate) => candidate.id === stored?.entry_id);
    if (entry) {
      result.push(message('user', entry.label, `entry-answer-${domain.id}`));
      result.push(message('bot', entry.branchQuestion, `branch-question-${domain.id}`));
      const branch = entry.branchOptions.find((candidate) => candidate.id === stored?.branch_id);
      if (branch) result.push(message('user', branch.label, `branch-answer-${domain.id}`));
    }
  });
  return result;
}

export default function IrcExperience() {
  const [payload, setPayload] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [deliveryError, setDeliveryError] = useState('');
  const [phase, setPhase] = useState('questions');
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const deliveryAttemptedRef = useRef(false);

  const load = useCallback(async () => {
    const response = await fetch('/api/irc/diagnostic', { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'diagnostic_load_failed');
    setPayload(data);
    setMessages(reconstructMessages(data));
    if (data.diagnostic.status === 'report_ready') setPhase('complete');
    else if (data.diagnostic.status === 'generation_failed') {
      setPhase('error');
      setError('Não foi possível concluir a análise agora.');
    } else if (['answers_completed', 'generating_report'].includes(data.diagnostic.status)) {
      setPhase('processing');
    } else {
      setPhase('questions');
    }
    return data;
  }, []);

  const generate = useCallback(async () => {
    setPhase('processing');
    setError('');
    const response = await fetch('/api/irc/generate', { method: 'POST' });
    const data = await response.json().catch(() => ({}));
    if (response.status === 202) return null;
    if (!response.ok) throw new Error(data.error || 'report_generation_failed');
    setPayload((current) => ({ ...current, diagnostic: data.diagnostic }));
    setPhase('complete');
    return data;
  }, []);

  const deliverReport = useCallback(async () => {
    if (delivering) return;
    setDelivering(true);
    setDeliveryError('');
    try {
      const response = await fetch('/api/irc/deliver', { method: 'POST' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'delivery_failed');
      await load();
    } catch (_) {
      setDeliveryError('Não foi possível preparar o PDF e enviar o e-mail agora.');
      await load().catch(() => {});
    } finally {
      setDelivering(false);
    }
  }, [delivering, load]);

  useEffect(() => {
    let active = true;
    load()
      .then((data) => {
        if (active && data.diagnostic.status === 'answers_completed') {
          generate().catch(() => {
            if (active) {
              setPhase('error');
              setError('Não foi possível concluir a análise agora.');
            }
          });
        }
      })
      .catch(() => active && setError('Não foi possível carregar seu diagnóstico.'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [generate, load]);

  useEffect(() => {
    if (phase !== 'processing' || payload?.diagnostic?.status !== 'generating_report') return undefined;
    const timer = window.setInterval(() => {
      load().catch(() => {});
    }, 2500);
    return () => window.clearInterval(timer);
  }, [load, payload?.diagnostic?.status, phase]);

  useEffect(() => {
    if (
      phase !== 'complete' ||
      (payload?.diagnostic?.pdf_ready && payload?.diagnostic?.email_status === 'sent')
    ) {
      return undefined;
    }

    if (deliveryAttemptedRef.current) return undefined;
    deliveryAttemptedRef.current = true;
    void deliverReport();
    return undefined;
  }, [deliverReport, payload?.diagnostic?.email_status, payload?.diagnostic?.pdf_ready, phase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, phase]);

  const currentDomain = payload?.domains?.[payload?.diagnostic?.current_domain];
  const storedEntry = currentDomain?.options.find(
    (candidate) => candidate.id === payload?.diagnostic?.answers?.[currentDomain?.id]?.entry_id
  );
  const choices = payload?.diagnostic?.current_stage === 'branch' ? storedEntry?.branchOptions || [] : currentDomain?.options || [];
  const completedSteps = useMemo(() => {
    if (!payload) return 0;
    const domain = Number(payload.diagnostic.current_domain || 0);
    if (payload.diagnostic.current_stage === 'complete') return payload.total_steps;
    return domain * 2 + (payload.diagnostic.current_stage === 'branch' ? 1 : 0);
  }, [payload]);

  async function choose(option) {
    if (!currentDomain || saving) return;
    const stage = payload.diagnostic.current_stage;
    setSaving(true);
    setError('');
    setMessages((current) => [...current, message('user', option.label, `${Date.now()}-${option.id}`)]);

    try {
      const response = await fetch('/api/irc/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain_id: currentDomain.id, stage, option_id: option.id })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'answer_save_failed');

      const nextPayload = { ...payload, diagnostic: data.diagnostic };
      setPayload(nextPayload);
      if (data.diagnostic.status === 'answers_completed') {
        setMessages((current) => [
          ...current,
          message('bot', 'Você concluiu as 12 respostas. Agora vou cruzar os seis temas para encontrar o padrão central por trás delas.', 'completed')
        ]);
        await generate();
      } else {
        setMessages(reconstructMessages(nextPayload));
      }
    } catch (_) {
      setError('Não foi possível salvar sua resposta. Tente novamente.');
      await load().catch(() => {});
    } finally {
      setSaving(false);
    }
  }

  async function retry() {
    try {
      await generate();
    } catch (_) {
      setPhase('error');
      setError('Não foi possível concluir a análise agora.');
    }
  }

  if (loading) {
    return <main className={styles.loadingShell}><div className={styles.spinner} /><p>Carregando seu diagnóstico…</p></main>;
  }

  if (!payload) {
    return <main className={styles.loadingShell}><p>{error || 'Não foi possível carregar.'}</p></main>;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Image src="/logo-zeroapp-light.png" alt="ZeroApp" width={42} height={42} priority />
        <div>
          <strong>Diagnóstico Completo</strong>
          <span>IRC · Finanças do Zero</span>
        </div>
        <div className={styles.progressLabel}>{Math.min(payload.total_steps, completedSteps + (phase === 'questions' ? 1 : 0))} de {payload.total_steps}</div>
        <div className={styles.progressTrack}><div style={{ width: `${(completedSteps / payload.total_steps) * 100}%` }} /></div>
      </header>

      <main className={styles.conversation}>
        {messages.map((item) => (
          <div key={item.key} className={`${styles.messageRow} ${item.sender === 'user' ? styles.userRow : ''}`}>
            {item.sender === 'bot' ? <span className={styles.avatar}>JS</span> : null}
            <div className={`${styles.bubble} ${item.sender === 'user' ? styles.userBubble : styles.botBubble}`}>{item.text}</div>
          </div>
        ))}

        {phase === 'questions' ? (
          <div className={styles.choices} aria-label="Opções de resposta">
            {choices.map((choice) => (
              <button key={choice.id} type="button" disabled={saving} onClick={() => choose(choice)}>{choice.label}</button>
            ))}
          </div>
        ) : null}

        {phase === 'processing' ? (
          <section className={styles.processing} role="status">
            <div className={styles.spinner} />
            <strong>Cruzando suas respostas</strong>
            <p>Identificando a crença central, os ciclos que sustentam esse padrão e os movimentos mais coerentes para a sua realidade.</p>
            <small>Esta análise pode levar alguns instantes.</small>
          </section>
        ) : null}

        {phase === 'error' ? (
          <section className={styles.errorCard} role="alert">
            <strong>Suas respostas estão salvas.</strong>
            <p>{error} Você pode tentar novamente sem refazer o diagnóstico.</p>
            <button type="button" onClick={retry}>TENTAR GERAR NOVAMENTE</button>
          </section>
        ) : null}

        {phase === 'complete' ? (
          <section className={styles.reportCard}>
            <span className={styles.ready}>Sua análise está pronta.</span>
            <p className={styles.reportIntro}>Cruzei tudo o que você revelou ao longo da conversa. Esta é uma leitura integrada do padrão que está influenciando suas decisões financeiras.</p>
            <IrcReport report={payload.diagnostic.report} />
            <div className={styles.reportActions}>
              {payload.diagnostic.pdf_ready ? (
                <a href="/api/irc/pdf">BAIXAR PDF</a>
              ) : (
                <span>{delivering ? 'Preparando PDF…' : payload.diagnostic.pdf_status === 'failed' ? 'PDF não gerado' : 'PDF em preparação'}</span>
              )}
              <span>
                {payload.diagnostic.email_status === 'sent'
                  ? 'Enviado por e-mail'
                  : delivering
                    ? 'Preparando envio…'
                    : payload.diagnostic.email_status === 'failed'
                      ? 'E-mail não enviado'
                      : 'Envio por e-mail em preparação'}
              </span>
              {(deliveryError ||
                payload.diagnostic.pdf_status === 'failed' ||
                payload.diagnostic.email_status === 'failed') &&
              !(payload.diagnostic.pdf_ready && payload.diagnostic.email_status === 'sent') ? (
                <button type="button" disabled={delivering} onClick={deliverReport}>
                  {delivering ? 'TENTANDO NOVAMENTE…' : 'TENTAR GERAR E ENVIAR NOVAMENTE'}
                </button>
              ) : null}
            </div>
            {deliveryError ? <p className={styles.deliveryError} role="alert">{deliveryError}</p> : null}
          </section>
        ) : null}

        {error && phase === 'questions' ? <p className={styles.inlineError} role="alert">{error}</p> : null}
        <div ref={bottomRef} />
      </main>
    </div>
  );
}
