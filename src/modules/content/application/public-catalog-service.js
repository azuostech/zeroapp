import 'server-only';
import { getAnonSupabase } from '@/src/lib/supabase/anon';

function toPublicProgram(row) {
  const tierRequired = String(row?.tier_required || 'LIVRE').toUpperCase();
  const title = String(row?.title || '').trim();

  return {
    id: row?.id,
    title,
    description: String(row?.description || '').trim(),
    cover_image_url: normalizePublicUrl(row?.thumbnail_url) || null,
    tier_required: tierRequired,
    turma_exclusiva: row?.turma_exclusiva || null,
    total_sessoes: Number(row?.sessions_count || 0),
    total_aulas: Number(row?.catalog_total_aulas || 0),
    is_free: tierRequired === 'LIVRE' || tierRequired === 'DESPERTAR',
    is_blog: title.toLocaleLowerCase('pt-BR').includes('blog')
  };
}

export async function getPublicPrograms() {
  const supabase = getAnonSupabase();
  const { data, error } = await supabase.rpc('get_content_program_catalog');

  if (error) {
    throw new Error(error.message || 'public_program_catalog_failed');
  }

  return (data || []).map(toPublicProgram).filter((program) => program.id && program.title);
}

function normalizePublicUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.toString() : '';
  } catch (_) {
    return '';
  }
}

function toPublicBlogArticle(row) {
  return {
    id: row?.id,
    program_id: row?.program_id,
    title: String(row?.title || '').trim(),
    description: String(row?.description || '').trim(),
    content_type: String(row?.content_type || 'article').trim(),
    url: normalizePublicUrl(row?.article_url),
    thumbnail_url: normalizePublicUrl(row?.thumbnail_url) || null,
    session_title: String(row?.session_title || '').trim(),
    published_at: row?.published_at || null
  };
}

export async function getPublicBlogArticles(programId) {
  const normalizedProgramId = String(programId || '').trim();
  if (!normalizedProgramId) return [];

  const supabase = getAnonSupabase();
  const { data, error } = await supabase.rpc('get_public_blog_articles', {
    p_program_id: normalizedProgramId
  });

  if (error) {
    throw new Error(error.message || 'public_blog_articles_failed');
  }

  return (data || [])
    .map(toPublicBlogArticle)
    .filter((article) => article.id && article.program_id === normalizedProgramId && article.title && article.url);
}

// Programas também podem ter a thumbnail alterada pelo admin. A consulta sem
// cache garante que a vitrine pública reflita a imagem cadastrada imediatamente.
export const getCachedPublicPrograms = getPublicPrograms;

// Artigos podem ter título, descrição e thumbnail alterados pelo admin.
// Mantemos a consulta sem cache para refletir essas edições imediatamente no portal.
export const getCachedPublicBlogArticles = getPublicBlogArticles;
