'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'zeroapp:jackson-ia-session';

export const QUICK_CHIPS = [
  { id: 'analise', label: '📊 Analisar minha carteira', message: 'Analisa minha carteira deste mês e me diz onde estou.' },
  { id: 'vazamento', label: '💸 Onde estou vazando?', message: 'Onde estou perdendo dinheiro que poderia economizar?' },
  { id: 'reserva', label: '🏦 Como melhorar minha reserva?', message: 'Como posso aumentar minha reserva de emergência?' },
  { id: 'identidade', label: '💎 Trabalhar identidade', message: 'Quero refletir sobre minha identidade financeira.' },
  {
    id: 'gratidao',
    label: '🌸 Refletir gratidão',
    message: 'Me ajuda a refletir sobre o que tenho de bom na minha jornada financeira.'
  },
  { id: 'proximo', label: '🎯 O que focar agora?', message: 'Dado meu momento atual, qual deve ser meu próximo foco?' }
];

function buildMessage(role, content, extras = {}) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    ...extras
  };
}

function detectMuralIntent(input) {
  const normalized = String(input || '')
    .trim()
    .toLowerCase();

  if (!normalized) return false;

  return /\bmural\b|quadro dos sonhos|vision board|imagem do sonho|criar imagem|sonho financeiro/.test(normalized);
}

function loadSessionState() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
      isMuralMode: Boolean(parsed.isMuralMode),
      lastDream: typeof parsed.lastDream === 'string' ? parsed.lastDream : ''
    };
  } catch (_) {
    return null;
  }
}

function saveSessionState(state) {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (_) {
    // no-op
  }
}

async function parseApiPayload(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (_) {
    return { raw: text };
  }
}

export function useJacksonIA() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuralMode, setIsMuralMode] = useState(false);
  const [lastDream, setLastDream] = useState('');
  const [error, setError] = useState(null);
  const [lastFailedInput, setLastFailedInput] = useState('');

  const messagesRef = useRef([]);

  useEffect(() => {
    const saved = loadSessionState();
    if (!saved) return;

    setMessages(saved.messages);
    messagesRef.current = saved.messages;
    setIsMuralMode(saved.isMuralMode);
    setLastDream(saved.lastDream || '');
  }, []);

  useEffect(() => {
    saveSessionState({ messages, isMuralMode, lastDream });
  }, [messages, isMuralMode, lastDream]);

  const appendMessage = useCallback((message) => {
    setMessages((prev) => {
      const next = [...prev, message];
      messagesRef.current = next;
      return next;
    });
  }, []);

  const removeLastMessage = useCallback(() => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      messagesRef.current = next;
      return next;
    });
  }, []);

  const callMuralApi = useCallback(
    async (dreamText) => {
      const response = await fetch('/api/ai/mural', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sonho: dreamText })
      });

      const payload = await parseApiPayload(response);
      if (!response.ok) {
        const apiError = typeof payload?.error === 'string' ? payload.error : 'Erro ao gerar mural';
        throw new Error(apiError);
      }

      return payload;
    },
    []
  );

  const callChatApi = useCallback(async (apiMessages) => {
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: apiMessages })
    });

    const payload = await parseApiPayload(response);
    if (!response.ok) {
      const apiError = typeof payload?.error === 'string' ? payload.error : 'Erro na resposta do agente';
      throw new Error(apiError);
    }

    return payload;
  }, []);

  const sendMessage = useCallback(
    async (rawInput) => {
      const userInput = String(rawInput || '').trim();
      if (!userInput || isLoading) return;

      setError(null);
      setLastFailedInput(userInput);

      const userMessage = buildMessage('user', userInput);
      const syncedHistory = [...messagesRef.current, userMessage];
      messagesRef.current = syncedHistory;
      setMessages(syncedHistory);

      if (isMuralMode) {
        setIsLoading(true);
        try {
          const muralPayload = await callMuralApi(userInput);
          setLastDream(userInput);
          setIsMuralMode(false);

          appendMessage(buildMessage('assistant', 'Perfeito. Transformei seu sonho em um mural para você visualizar todos os dias.'));
          appendMessage(
            buildMessage('assistant', 'Mural gerado', {
              type: 'mural',
              mural: muralPayload
            })
          );
        } catch (err) {
          removeLastMessage();
          setError(err instanceof Error ? err.message : 'Erro ao gerar mural');
        } finally {
          setIsLoading(false);
        }

        return;
      }

      if (detectMuralIntent(userInput)) {
        setIsMuralMode(true);
        appendMessage(
          buildMessage(
            'assistant',
            'Me conta: qual é o seu maior sonho financeiro? Pode ser casa, viagem ou liberdade financeira. Seja específico no que isso significa para você.'
          )
        );
        return;
      }

      setIsLoading(true);

      try {
        const apiMessages = syncedHistory
          .filter((message) => message?.role && typeof message?.content === 'string' && message?.type !== 'mural')
          .map((message) => ({ role: message.role, content: message.content }));

        const payload = await callChatApi(apiMessages);
        const assistantText = String(payload?.message || '').trim();

        if (!assistantText) {
          throw new Error('Resposta vazia do agente');
        }

        appendMessage(buildMessage('assistant', assistantText));
      } catch (err) {
        removeLastMessage();
        setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem');
      } finally {
        setIsLoading(false);
      }
    },
    [appendMessage, callChatApi, callMuralApi, isLoading, isMuralMode, removeLastMessage]
  );

  const retryLast = useCallback(async () => {
    if (!lastFailedInput || isLoading) return;
    await sendMessage(lastFailedInput);
  }, [isLoading, lastFailedInput, sendMessage]);

  const regenerateMural = useCallback(
    async (dreamText) => {
      const dream = String(dreamText || lastDream || '').trim();
      if (!dream || isLoading) return;

      setIsLoading(true);
      setError(null);

      try {
        const muralPayload = await callMuralApi(dream);

        appendMessage(
          buildMessage('assistant', 'Gerei uma nova versão do seu mural.', {
            type: 'mural',
            mural: muralPayload
          })
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao gerar novo mural');
      } finally {
        setIsLoading(false);
      }
    },
    [appendMessage, callMuralApi, isLoading, lastDream]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
    messagesRef.current = [];
    setError(null);
    setIsMuralMode(false);
    setLastFailedInput('');
    setLastDream('');
  }, []);

  return {
    messages,
    isLoading,
    isMuralMode,
    error,
    sendMessage,
    clearChat,
    retryLast,
    regenerateMural,
    hasMessages: messages.length > 0
  };
}
