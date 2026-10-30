import sharp from 'sharp';
import { routeContext } from '@/src/modules/patrimony/application/patrimony-api';
import { loadComparison } from '@/app/api/patrimony/compare/route';
import { formatBRL } from '@/src/modules/patrimony/domain/patrimony.money';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function escapeXml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function wrapText(value, maxLength = 24) {
  const words = String(value || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  for (const word of words) {
    const current = lines.at(-1);
    if (!current || `${current} ${word}`.length > maxLength) lines.push(word);
    else lines[lines.length - 1] = `${current} ${word}`;
  }
  return lines.slice(0, 4);
}

function percentText(item) {
  if (item.key === 'reserve_total' && item.from === 0 && item.to > 0) return 'criada';
  if (item.key === 'overdue_count' && item.to === 0) return 'zeradas';
  if (item.deltaPct == null) return item.direction === 'better' ? 'melhorou' : 'estável';
  return `${Math.round(Math.abs(item.deltaPct))}% ${item.direction === 'better' ? 'melhor' : 'de atenção'}`;
}

function buildShareSvg({ data, showValues, headline }) {
  const headlineLines = wrapText(headline, 24);
  const rows = data.indicators.filter((item) => item.key !== 'net_worth').slice(0, 4);
  const headlineMarkup = headlineLines.map((line, index) => (
    `<tspan x="86" dy="${index === 0 ? 0 : 86}">${escapeXml(line)}</tspan>`
  )).join('');
  const rowsStart = 610 + Math.max(0, headlineLines.length - 1) * 86;
  const rowsMarkup = rows.map((row, index) => {
    const y = rowsStart + index * 108;
    const value = showValues
      ? `${formatBRL(row.from)} → ${formatBRL(row.to)}`
      : percentText(row);
    return `
      <text x="86" y="${y}" class="row-label">${escapeXml(row.label)}</text>
      <text x="994" y="${y}" text-anchor="end" class="row-value">${escapeXml(value)}</text>
      <line x1="86" y1="${y + 30}" x2="994" y2="${y + 30}" stroke="#315843" stroke-width="2" />`;
  }).join('');
  const progress = data.netWorthZeroProgress;
  const progressMarkup = progress == null ? '' : `
    <text x="86" y="1250" class="progress-label">Rumo ao Patrimônio Zero</text>
    <text x="994" y="1250" text-anchor="end" class="progress-label strong">${Math.max(0, Math.min(100, progress))}%</text>
    <rect x="86" y="1280" width="908" height="24" rx="12" fill="#315843" />
    <rect x="86" y="1280" width="${Math.round(908 * Math.max(0, Math.min(100, progress)) / 100)}" height="24" rx="12" fill="#7EE2A0" />`;

  return `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    <rect width="1080" height="1920" fill="#0F2A1B" />
    <style>
      text { font-family: Arial, Helvetica, sans-serif; }
      .brand { fill: #7EE2A0; font-size: 34px; font-weight: 700; }
      .overline { fill: #B9D4C3; font-size: 42px; }
      .headline { fill: #7EE2A0; font-size: 76px; font-weight: 700; }
      .row-label { fill: #FFFFFF; font-size: 34px; }
      .row-value { fill: #7EE2A0; font-size: 34px; font-weight: 700; }
      .progress-label { fill: #FFFFFF; font-size: 30px; }
      .strong { font-weight: 700; }
      .footer { fill: #B9D4C3; font-size: 27px; }
    </style>
    <circle cx="121" cy="135" r="35" fill="none" stroke="#7EE2A0" stroke-width="4" />
    <text x="121" y="147" text-anchor="middle" class="brand">Z</text>
    <text x="180" y="147" class="brand">MINHA EVOLUÇÃO</text>
    <text x="86" y="370" class="overline">Em ${escapeXml(data.days)} dias de método</text>
    <text x="86" y="480" class="headline">${headlineMarkup}</text>
    ${rowsMarkup}
    ${progressMarkup}
    <text x="86" y="1780" class="footer strong">Finanças do Zero · @jacksonsouzarc</text>
    <text x="86" y="1830" class="footer">Faça seu diagnóstico gratuito — link na bio</text>
  </svg>`;
}

export async function renderShareImage({ data, showValues = false, headline }) {
  const svg = buildShareSvg({ data, showValues, headline });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

export async function GET(request) {
  const query = request.nextUrl.searchParams;
  const resolved = await routeContext({
    request,
    requestedUserId: query.get('user_id'),
    resource: 'patrimony_share'
  });
  if (resolved.response) return resolved.response;

  try {
    const data = await loadComparison({
      supabase: resolved.supabase,
      userId: resolved.context.targetUserId,
      from: query.get('from') || 'baseline',
      to: query.get('to') || 'current'
    });
    const showValues = query.get('show_values') === '1';
    const mode = query.get('headline') || 'highlight';
    const custom = String(query.get('text') || '').replace(/[<>]/g, '').slice(0, 80);
    const headline = mode === 'custom' && custom
      ? custom
      : mode === 'progress' && data.netWorthZeroProgress != null
        ? `Estou ${data.netWorthZeroProgress}% mais perto do Patrimônio Zero.`
        : data.highlight;
    const png = await renderShareImage({ data, showValues, headline });

    return new Response(png, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(png.length),
        'Cache-Control': 'private, no-store, max-age=0'
      }
    });
  } catch (error) {
    console.error('patrimony_share_image_failed', error);
    return Response.json({ error: error.message || 'share_image_failed' }, { status: error.status || 500 });
  }
}
