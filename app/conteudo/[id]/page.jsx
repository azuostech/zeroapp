import Link from 'next/link';
import { redirect } from 'next/navigation';
import BottomNav from '@/components/layout/BottomNav';
import ContentAccessTracker from '@/components/content/ContentAccessTracker';
import { ContentEmbed } from '@/components/ui/ContentEmbed';
import styles from './player.module.css';
import { createServerSupabase } from '@/src/lib/supabase/server';
import { getCurrentProfile } from '@/src/modules/profile/application/profile-service';
import { resolveImageUrlForDisplay } from '@/src/lib/drive-image-url';

function resolveTypeLabel(contentType) {
  const key = String(contentType || '').toLowerCase();
  if (key === 'video') return '🎬 Vídeo';
  if (key === 'pdf') return '📄 PDF';
  if (key === 'article') return '📝 Artigo';
  if (key === 'tool') return '🔧 Ferramenta';
  return '📚 Conteúdo';
}

function resolveTierLabel(tierRequired) {
  const key = String(tierRequired || '').toUpperCase();
  if (key === 'LIVRE') return '🌱 Grátis';
  if (key === 'MOVIMENTO') return '🎓 Mentorado';
  if (key === 'ACELERACAO') return '⚡ Aceleração';
  if (key === 'AUTOGOVERNO') return '💎 Autogoverno';
  return key || 'Sem nível';
}

function parseDateOnly(dateValue) {
  const value = String(dateValue || '').trim();
  if (!value) return null;

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function isLockedByReleaseDate(dateValue) {
  const releaseDate = parseDateOnly(dateValue);
  if (!releaseDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today < releaseDate;
}
export default async function ConteudoPlayerPage({ params }) {
  const resolvedParams = await params;
  const contentId = String(resolvedParams?.id || '').trim();
  if (!contentId) {
    redirect('/conteudo');
  }

  const supabase = await createServerSupabase();
  const { user } = await getCurrentProfile(supabase);

  if (!user) {
    redirect('/');
  }

  const { data: conteudo, error } = await supabase
    .from('member_area_content')
    .select('*')
    .eq('id', contentId)
    .eq('is_published', true)
    .single();

  if (error || !conteudo) {
    redirect('/conteudo');
  }

  if (isLockedByReleaseDate(conteudo?.disponivel_em)) {
    redirect('/conteudo');
  }
  const typeLabel = resolveTypeLabel(conteudo.content_type);
  const tierLabel = resolveTierLabel(conteudo.tier_required);
  const posterUrl = resolveImageUrlForDisplay(conteudo.thumbnail_url);
  const tierKey = String(conteudo.tier_required || '').toUpperCase();
  const tierClass =
    {
      LIVRE: styles.badgeLivre,
      MOVIMENTO: styles.badgeMovimento,
      ACELERACAO: styles.badgeAceleracao,
      AUTOGOVERNO: styles.badgeAutogoverno
    }[tierKey] || styles.badgeLivre;

  return (
    <div className={styles.contentPlayerPage}>
      <div className={styles.playerHeader}>
        <Link href="/conteudo" className={styles.backBtn}>
          ‹
        </Link>
        <span className={styles.playerTitle}>{conteudo.title}</span>
      </div>

      <main className={styles.playerMain}>
        <div className={styles.playerWrapper}>
          <ContentEmbed
            url={conteudo.url}
            contentType={conteudo.content_type}
            title={conteudo.title}
            poster={posterUrl || null}
          />
        </div>

        <section className={styles.playerInfo}>
          <h1 className={styles.playerInfoTitle}>{conteudo.title}</h1>
          {conteudo.description ? <p className={styles.playerInfoDesc}>{conteudo.description}</p> : null}

          <div className={styles.playerInfoBadges}>
            <span className={styles.badgeTipo}>{typeLabel}</span>
            <span className={`${styles.badgeTier} ${tierClass}`}>{tierLabel}</span>
          </div>

          <p className={styles.playerInfoNote}>
            Se algum conteúdo não abrir no player por restrição externa, use o botão de abrir externamente.
          </p>
        </section>
      </main>

      <ContentAccessTracker contentId={contentId} />
      <BottomNav activeTab="inicio" />
    </div>
  );
}
