import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { buildUserContext } from '@/src/lib/ai/context-builder';
import { buildSystemPrompt } from '@/src/lib/ai/system-prompt';

export const runtime = 'nodejs';

const MODEL = String(process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5').trim();
const MAX_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 1600;

let anthropicClient = null;

function getAnthropicClient() {
  const apiKey = String(process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey) return null;

  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey });
  }

  return anthropicClient;
}

async function parseBodySafe(request) {
  try {
    return await request.json();
  } catch (_) {
    return null;
  }
}

function normalizeMessages(rawMessages) {
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    return { ok: false, error: 'Mensagens inválidas' };
  }

  const normalized = [];

  for (const item of rawMessages) {
    const role = item?.role;
    const content = typeof item?.content === 'string' ? item.content.trim() : '';

    if (!['user', 'assistant'].includes(role)) {
      return { ok: false, error: 'Formato de mensagem inválido' };
    }

    if (!content) {
      return { ok: false, error: 'Formato de mensagem inválido' };
    }

    normalized.push({
      role,
      content: content.slice(0, MAX_MESSAGE_LENGTH)
    });
  }

  return {
    ok: true,
    value: normalized.slice(-MAX_MESSAGES)
  };
}

export async function POST(request) {
  const supabase = await createServerSupabase();
  const { user, profile } = await getCurrentProfile(supabase);

  if (!user || !profile) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  if (profile.status !== 'active') {
    return NextResponse.json({ error: 'Conta inativa' }, { status: 403 });
  }

  const client = getAnthropicClient();
  if (!client) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada' }, { status: 500 });
  }

  const body = await parseBodySafe(request);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const parsedMessages = normalizeMessages(body.messages);
  if (!parsedMessages.ok) {
    return NextResponse.json({ error: parsedMessages.error }, { status: 422 });
  }

  try {
    const userContext = await buildUserContext(user.id, { supabase });
    const systemPrompt = buildSystemPrompt(userContext);

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      temperature: 0.3,
      system: systemPrompt,
      messages: parsedMessages.value
    });

    const assistantMessage = response.content?.find((item) => item.type === 'text')?.text?.trim() || '';

    if (!assistantMessage) {
      return NextResponse.json({ error: 'Resposta vazia do agente' }, { status: 502 });
    }

    return NextResponse.json({
      message: assistantMessage,
      usage: {
        input_tokens: Number(response.usage?.input_tokens || 0),
        output_tokens: Number(response.usage?.output_tokens || 0)
      }
    });
  } catch (error) {
    console.error('[jackson-ia] Erro na API Anthropic:', error);

    const status = Number(error?.status || 0);
    const message = String(error?.message || '');

    if (status === 401) {
      return NextResponse.json({ error: 'Configuração do agente inválida' }, { status: 500 });
    }

    if (status === 429) {
      return NextResponse.json({ error: 'Muitas requisições. Tente novamente em alguns segundos.' }, { status: 429 });
    }

    if (status === 400 || status === 404) {
      return NextResponse.json({ error: 'Configuração do modelo inválida. Ajuste ANTHROPIC_MODEL.' }, { status: 500 });
    }

    if (message.toLowerCase().includes('deprecated')) {
      return NextResponse.json({ error: 'Modelo Anthropic desatualizado. Ajuste ANTHROPIC_MODEL.' }, { status: 500 });
    }

    if (message.toLowerCase().includes('connection error')) {
      return NextResponse.json({ error: 'Falha de conexão com o serviço de IA. Tente novamente em instantes.' }, { status: 502 });
    }

    return NextResponse.json({ error: 'Erro ao processar sua mensagem. Tente novamente.' }, { status: 500 });
  }
}
