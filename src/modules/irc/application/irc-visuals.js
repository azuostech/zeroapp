import 'server-only';
import crypto from 'node:crypto';
import { canonicalizeAnswers } from '../domain/irc-domains';

export const IRC_VISUAL_VERSION = 'irc-visual-v1';
export const IRC_VISUAL_KEYS = ['cover', 'cycle', 'future'];

const BRAND_STYLE = `premium Brazilian financial education editorial illustration, refined vector-like geometry mixed with subtle paper grain and soft depth, deep forest green, emerald, warm golden yellow, cream and charcoal palette, calm and human, print-ready`;
const SAFETY = `No text, no letters, no numbers, no logos, no watermark, no coins, no banknotes, no credit cards, no charts with invented data, no identifiable portrait.`;

function answerSummary(answers) {
  const canonical = canonicalizeAnswers(answers);
  if (!canonical) return null;
  return Object.fromEntries(canonical.map((item) => [item.dominio, {
    primary: item.opcao_escolhida,
    branch: item.opcao_ramificacao
  }]));
}

export function buildIrcVisualSpecs({ answers }) {
  const summary = answerSummary(answers);
  if (!summary) return [];

  return [
    {
      key: 'cover',
      size: '1024x1536',
      prompt: `Use case: infographic-diagram
Asset type: cover illustration for an individual financial diagnostic PDF
Primary request: create a symbolic path from the financial belief "${summary.raiz.primary}" and the current emotion "${summary.emocao.primary}" toward the desired future "${summary.visao_futuro.primary}". The path must move from uncertainty into clarity and organized action, without portraying a specific person.
Style/medium: ${BRAND_STYLE}
Composition/framing: portrait A4-friendly composition, main path rising through the scene, strong focal point and generous negative space for editorial copy added later by the PDF renderer
Constraints: ${SAFETY}`
    },
    {
      key: 'cycle',
      size: '1024x1024',
      prompt: `Use case: infographic-diagram
Asset type: square editorial illustration for an individual financial diagnostic PDF
Primary request: visualize a behavioral loop connecting the emotion "${summary.emocao.primary}", its manifestation "${summary.emocao.branch}", the self-sabotage pattern "${summary.autossabotagem.primary}" and the detail "${summary.autossabotagem.branch}". Show one clear exit created by method, naming and organized action.
Style/medium: ${BRAND_STYLE}
Composition/framing: centered circular maze or looping ribbon with a visible opening toward a calm organized space, clean silhouette
Constraints: ${SAFETY}`
    },
    {
      key: 'future',
      size: '1536x1024',
      prompt: `Use case: infographic-diagram
Asset type: landscape editorial illustration for an individual financial diagnostic PDF
Primary request: symbolize a bridge from the present toward "${summary.visao_futuro.primary}". Calibrate the distance using "${summary.visao_futuro.branch}" and show that change becomes possible through "${summary.capacidade_mudanca.primary}" with the need "${summary.capacidade_mudanca.branch}". Use structural segments that suggest a practical financial method.
Style/medium: ${BRAND_STYLE}
Composition/framing: wide landscape composition, bridge moving from uncertainty to a warm protected destination, no literal family portrait
Constraints: ${SAFETY}`
    }
  ];
}

function getConfig() {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  const model = String(process.env.OPENAI_IRC_IMAGE_MODEL || 'gpt-image-2').trim();
  return { apiKey, model };
}

async function generateImage(spec, { apiKey, model, user }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 110_000);
  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        prompt: spec.prompt,
        size: spec.size,
        quality: 'medium',
        output_format: 'png',
        background: 'opaque',
        n: 1,
        user
      }),
      signal: controller.signal
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`openai_image_failed:${response.status}:${payload?.error?.code || 'unknown'}`);
    }
    const encoded = payload?.data?.[0]?.b64_json;
    if (!encoded) throw new Error('openai_image_missing_data');
    const buffer = Buffer.from(encoded, 'base64');
    if (buffer.length < 1024) throw new Error('openai_image_invalid_data');
    return { ...spec, buffer, mimeType: 'image/png' };
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateIrcVisualAssets({ answers, diagnosticId, userId }) {
  const specs = buildIrcVisualSpecs({ answers });
  if (specs.length !== IRC_VISUAL_KEYS.length) throw new Error('invalid_visual_answers');
  const config = getConfig();
  if (!config.apiKey) {
    return { assets: [], model: null, version: IRC_VISUAL_VERSION, fallback: true, specs };
  }

  const user = crypto.createHash('sha256').update(`${userId}:${diagnosticId}`).digest('hex').slice(0, 32);
  const assets = await Promise.all(specs.map((spec) => generateImage(spec, { ...config, user })));
  return { assets, model: config.model, version: IRC_VISUAL_VERSION, fallback: false, specs };
}
