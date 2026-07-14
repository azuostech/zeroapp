import { NextResponse } from 'next/server';
import { getCachedPublicPrograms } from '@/src/modules/content/application/public-catalog-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const programs = await getCachedPublicPrograms();
    return NextResponse.json(
      { programs },
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (error) {
    console.error('[portal/programs] catalog failed:', error?.message || error);
    return NextResponse.json({ error: 'Erro ao carregar programas' }, { status: 500 });
  }
}
