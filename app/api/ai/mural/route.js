import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';

export const runtime = 'nodejs';

const MODEL = String(process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5').trim();
const FALLBACK_QUERY = 'financial freedom success';

let anthropicClient = null;

function getAnthropicClient() {
  const apiKey = String(process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey) return null;

  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey });
  }

  return anthropicClient;
}

function sanitizeDream(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

function normalizeQuery(raw) {
  const cleaned = String(raw || '')
    .replace(/[\n\r]/g, ' ')
    .replace(/["'`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return FALLBACK_QUERY;

  const words = cleaned
    .split(' ')
    .map((word) => word.replace(/[^a-zA-Z0-9-]/g, ''))
    .filter(Boolean)
    .slice(0, 5);

  if (words.length === 0) return FALLBACK_QUERY;

  return words.join(' ');
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

  const body = await request.json().catch(() => null);
  const sonho = sanitizeDream(body?.sonho);

  if (!sonho) {
    return NextResponse.json({ error: 'Descreva seu sonho financeiro' }, { status: 422 });
  }

  const client = getAnthropicClient();
  if (!client) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurada' }, { status: 500 });
  }

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 80,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `O usuário descreveu este sonho financeiro: "${sonho}"

Gere uma query de busca em inglês para o Unsplash que represente visualmente este sonho.
A query deve ser específica, visual e inspiradora.
Responda APENAS com a query, sem explicações. Máximo 5 palavras.
Exemplo: luxury house pool sunset`
        }
      ]
    });

    const rawQuery = response.content?.find((item) => item.type === 'text')?.text || '';
    const query = normalizeQuery(rawQuery);
    const imageUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(query)}`;

    return NextResponse.json({
      query,
      image_url: imageUrl,
      sonho_original: sonho
    });
  } catch (error) {
    console.error('[mural] Erro na geração de mural:', error);
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('deprecated')) {
      return NextResponse.json({ error: 'Modelo Anthropic desatualizado. Ajuste ANTHROPIC_MODEL.' }, { status: 500 });
    }

    if (message.includes('connection error')) {
      return NextResponse.json({ error: 'Falha de conexão com o serviço de IA. Tente novamente em instantes.' }, { status: 502 });
    }

    return NextResponse.json({ error: 'Erro ao gerar mural. Tente novamente.' }, { status: 500 });
  }
}
