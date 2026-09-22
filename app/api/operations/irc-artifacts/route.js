import { NextResponse } from 'next/server';
import { isCronRequestAuthorized } from '@/src/lib/security/cron-auth';
import { getServiceSupabase } from '@/src/lib/supabase/service';
import { IRC_VISUAL_VERSION } from '@/src/modules/irc/application/irc-visuals';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ASSETS = {
  cover: { suffix: 'visuals/cover.png', contentType: 'image/png' },
  cycle: { suffix: 'visuals/cycle.png', contentType: 'image/png' },
  future: { suffix: 'visuals/future.png', contentType: 'image/png' },
  pdf: { suffix: 'report.pdf', contentType: 'application/pdf' }
};

async function findDiagnostic(service, diagnosticId) {
  const { data, error } = await service
    .from('irc_diagnostics')
    .select('*')
    .eq('id', diagnosticId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function pathsFor(diagnostic) {
  const root = `${diagnostic.user_id}/${diagnostic.id}`;
  return Object.fromEntries(Object.entries(ASSETS).map(([key, asset]) => [key, `${root}/${asset.suffix}`]));
}

async function prepareUploads(service, diagnostic) {
  const bucket = service.storage.from('irc-reports');
  const paths = pathsFor(diagnostic);
  const entries = await Promise.all(Object.entries(paths).map(async ([key, path]) => {
    const { data, error } = await bucket.createSignedUploadUrl(path, { upsert: true });
    if (error) throw error;
    return [key, { ...data, contentType: ASSETS[key].contentType }];
  }));
  return Object.fromEntries(entries);
}

async function verifyUploads(service, paths) {
  const bucket = service.storage.from('irc-reports');
  const entries = await Promise.all(Object.entries(paths).map(async ([key, path]) => {
    const { data, error } = await bucket.download(path);
    if (error || !data) throw error || new Error(`artifact_missing:${key}`);
    return [key, data.size];
  }));
  const sizes = Object.fromEntries(entries);
  if (sizes.pdf < 10_000 || ['cover', 'cycle', 'future'].some((key) => sizes[key] < 1_000)) {
    throw new Error('artifact_invalid_size');
  }
  return sizes;
}

export async function POST(request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const diagnosticId = String(body.diagnostic_id || '').trim();
    const action = String(body.action || '').trim();
    if (!diagnosticId || !['prepare', 'finalize'].includes(action)) {
      return NextResponse.json({ error: 'invalid_artifact_operation' }, { status: 400 });
    }

    const service = getServiceSupabase();
    const diagnostic = await findDiagnostic(service, diagnosticId);
    if (!diagnostic) return NextResponse.json({ error: 'diagnostic_not_found' }, { status: 404 });
    if (diagnostic.status !== 'report_ready') {
      return NextResponse.json({ error: 'report_not_ready' }, { status: 409 });
    }

    if (action === 'prepare') {
      return NextResponse.json({ uploads: await prepareUploads(service, diagnostic) });
    }

    const paths = pathsFor(diagnostic);
    const sizes = await verifyUploads(service, paths);
    const promptMetadata = diagnostic.visual_assets?.prompts || {};
    const now = new Date().toISOString();
    const { error } = await service
      .from('irc_diagnostics')
      .update({
        visual_status: 'ready',
        visual_version: IRC_VISUAL_VERSION,
        visual_model: 'manual-curated',
        visual_assets: {
          files: { cover: paths.cover, cycle: paths.cycle, future: paths.future },
          prompts: promptMetadata
        },
        visuals_generated_at: now,
        visual_last_error: null,
        pdf_path: paths.pdf,
        pdf_status: 'ready',
        pdf_generated_at: now,
        delivery_attempts: 0,
        delivery_next_attempt_at: null,
        last_error: null
      })
      .eq('id', diagnostic.id);
    if (error) throw error;
    return NextResponse.json({ attached: true, paths, sizes });
  } catch (error) {
    console.error('[operations/irc-artifacts] failed:', error?.message || error);
    return NextResponse.json({ error: 'artifact_operation_failed' }, { status: 500 });
  }
}
