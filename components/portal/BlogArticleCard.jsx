'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Link2, MessageCircle, Share2 } from 'lucide-react';
import { resolveImageUrlForDisplay } from '@/src/lib/drive-image-url';
import styles from './portal.module.css';

function getHostname(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch (_) {
    return 'Artigo externo';
  }
}

function copyToClipboard(value) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(value);

  const input = document.createElement('textarea');
  input.value = value;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  input.remove();
  return Promise.resolve();
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <rect width="18" height="18" x="3" y="3" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function BlogArticleCard({ article, compact = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const shareAreaRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const closeMenu = (event) => {
      if (!shareAreaRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  if (!article?.url) return null;

  const articlePath = `/portal/${article.program_id}/artigos/${article.id}`;
  const thumbnailUrl = resolveImageUrlForDisplay(article.thumbnail_url);
  const imageStyle = thumbnailUrl
    ? { backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.04), rgba(0,0,0,0.32)), url(${JSON.stringify(thumbnailUrl)})` }
    : undefined;

  const getShareData = () => {
    const url = new URL(articlePath, window.location.origin).toString();
    return {
      title: article.title,
      text: `${article.title} — confira este artigo`,
      url,
    };
  };

  const handleWhatsAppShare = () => {
    const { text, url } = getShareData();
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
      '_blank',
      'noopener,noreferrer'
    );
    setMenuOpen(false);
  };

  const handleInstagramShare = async () => {
    const shareData = getShareData();

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setMenuOpen(false);
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }

    await copyToClipboard(shareData.url);
    setFeedback('Link copiado — abra o Instagram');
    setTimeout(() => setFeedback(''), 2600);
  };

  const handleCopyLink = async () => {
    await copyToClipboard(getShareData().url);
    setFeedback('Link copiado');
    setTimeout(() => {
      setFeedback('');
      setMenuOpen(false);
    }, 1400);
  };

  return (
    <article className={`${styles.articleCard} ${compact ? styles.articleCardCompact : ''}`}>
      <Link
        href={articlePath}
        className={styles.articleCardMain}
        aria-label={`Ler artigo: ${article.title}`}
      >
        <div className={`${styles.articleCover} ${thumbnailUrl ? '' : styles.articleCoverFallback}`} style={imageStyle}>
          <span>{article.session_title || 'Finanças do Zero'}</span>
        </div>
        <div className={styles.articleBody}>
          <span className={styles.articleSource}>{getHostname(article.url)}</span>
          <h3>{article.title}</h3>
          {article.description ? <p>{article.description}</p> : null}
        </div>
      </Link>

      <div className={styles.articleActions} ref={shareAreaRef}>
        <Link href={articlePath} className={styles.articleLink}>
          Ler artigo <span aria-hidden="true">→</span>
        </Link>

        <button
          type="button"
          className={styles.articleShareButton}
          aria-label={`Compartilhar artigo: ${article.title}`}
          aria-expanded={menuOpen}
          onClick={() => {
            setFeedback('');
            setMenuOpen((open) => !open);
          }}
        >
          <Share2 size={16} aria-hidden="true" />
          Compartilhar
        </button>

        {menuOpen ? (
          <div className={styles.articleShareMenu} role="menu" aria-label="Opções de compartilhamento">
            <button type="button" role="menuitem" onClick={handleWhatsAppShare}>
              <MessageCircle size={18} aria-hidden="true" />
              WhatsApp
            </button>
            <button type="button" role="menuitem" onClick={handleInstagramShare}>
              <InstagramIcon />
              Instagram Stories
            </button>
            <button type="button" role="menuitem" onClick={handleCopyLink}>
              {feedback ? <Check size={18} aria-hidden="true" /> : <Link2 size={18} aria-hidden="true" />}
              {feedback || 'Copiar link'}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
