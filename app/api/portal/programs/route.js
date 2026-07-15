import { NextResponse } from 'next/server';
import {
  getCachedPublicBlogArticles,
  getCachedPublicPrograms
} from '@/src/modules/content/application/public-catalog-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const programs = await getCachedPublicPrograms();
    const blogProgram = programs.find((program) => program.is_blog);
    const blogArticles = blogProgram
      ? (await getCachedPublicBlogArticles(blogProgram.id)).slice(0, 3)
      : [];
    return NextResponse.json(
      { programs, blog_articles: blogArticles },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('[portal/programs] catalog failed:', error?.message || error);
    return NextResponse.json({ error: 'Erro ao carregar programas' }, { status: 500 });
  }
}
