import 'server-only';
import { unstable_cache } from 'next/cache';
import { getServiceSupabase } from '@/src/lib/supabase/service';

function toPublicProgram(row) {
  const tierRequired = String(row?.tier_required || 'LIVRE').toUpperCase();
  const title = String(row?.title || '').trim();

  return {
    id: row?.id,
    title,
    description: String(row?.description || '').trim(),
    cover_image_url: row?.thumbnail_url || null,
    tier_required: tierRequired,
    turma_exclusiva: row?.turma_exclusiva || null,
    total_sessoes: Number(row?.sessions_count || 0),
    total_aulas: Number(row?.catalog_total_aulas || 0),
    is_free: tierRequired === 'LIVRE' || tierRequired === 'DESPERTAR',
    is_blog: title.toLocaleLowerCase('pt-BR').includes('blog')
  };
}

export async function getPublicPrograms() {
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.rpc('get_content_program_catalog');

  if (error) {
    throw new Error(error.message || 'public_program_catalog_failed');
  }

  return (data || []).map(toPublicProgram).filter((program) => program.id && program.title);
}

export const getCachedPublicPrograms = unstable_cache(getPublicPrograms, ['public-program-catalog'], {
  revalidate: 300,
  tags: ['public-program-catalog']
});
