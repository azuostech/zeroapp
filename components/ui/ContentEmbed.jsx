'use client';

import { useMemo, useState } from 'react';
import { VideoPlayer } from '@/components/ui/VideoPlayer';

function normalizeUrl(url) {
  return String(url || '').trim();
}

function getEmbedConfig(rawUrl, contentType) {
  const url = normalizeUrl(rawUrl);
  const type = String(contentType || '').trim().toLowerCase();

  if (!url) {
    return { type: 'unsupported', sourceUrl: '' };
  }

  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) {
    return {
      type: 'youtube',
      sourceUrl: url,
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=0&rel=0&modestbranding=1`
    };
  }

  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    return {
      type: 'vimeo',
      sourceUrl: url,
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?dnt=1`
    };
  }

  if (url.endsWith('.mp4') || url.includes('.mp4?') || type === 'video') {
    return { type: 'mp4', sourceUrl: url, src: url };
  }

  if (url.endsWith('.pdf') || url.includes('/pdf') || type === 'pdf') {
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
      return {
        type: 'iframe',
        sourceUrl: url,
        embedUrl: `https://drive.google.com/file/d/${driveMatch[1]}/preview`
      };
    }

    return {
      type: 'iframe',
      sourceUrl: url,
      embedUrl: `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`
    };
  }

  return { type: 'iframe', sourceUrl: url, embedUrl: url };
}

export function ContentEmbed({ url, contentType, title, poster }) {
  const [iframeError, setIframeError] = useState(false);
  const config = useMemo(() => getEmbedConfig(url, contentType), [contentType, url]);

  if (config.type === 'mp4') {
    return (
      <div className="embed-shell">
        <VideoPlayer src={config.src} poster={poster} size="full" />
        <style jsx>{`
          .embed-shell {
            width: 100%;
            aspect-ratio: 16 / 9;
            background: #000;
            border-radius: var(--card-radius, 1rem);
            overflow: hidden;
          }
        `}</style>
      </div>
    );
  }

  if ((config.type === 'youtube' || config.type === 'vimeo') && !iframeError) {
    return (
      <div className="embed-video-frame">
        <iframe
          src={config.embedUrl}
          title={title || 'Conteúdo em vídeo'}
          className="embed-iframe"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          frameBorder="0"
          onError={() => setIframeError(true)}
        />
        <style jsx>{`
          .embed-video-frame {
            width: 100%;
            aspect-ratio: 16 / 9;
            border-radius: var(--card-radius, 1rem);
            overflow: hidden;
            background: #000;
          }

          .embed-iframe {
            width: 100%;
            height: 100%;
            border: 0;
          }
        `}</style>
      </div>
    );
  }

  if ((config.type === 'youtube' || config.type === 'vimeo') && iframeError) {
    return (
      <div className="unsupported-shell">
        <span className="unsupported-icon">▶️</span>
        <p>Este vídeo não pode ser reproduzido aqui.</p>
        <a href={config.sourceUrl} target="_blank" rel="noopener noreferrer">
          Assistir externamente →
        </a>
        <small>
          Para YouTube, use vídeo público ou não listado. Vídeos privados não funcionam em embed.
        </small>

        <style jsx>{`
          .unsupported-shell {
            width: 100%;
            aspect-ratio: 16 / 9;
            border-radius: var(--card-radius, 1rem);
            background: #0f1113;
            border: 1px solid #2f363d;
            color: #f3f3f3;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 10px;
            text-align: center;
            padding: 20px;
          }

          .unsupported-icon {
            font-size: 34px;
          }

          p {
            margin: 0;
            font-size: 14px;
            color: #a2abb4;
          }

          a {
            border-radius: 10px;
            padding: 10px 13px;
            border: 1px solid rgba(0, 200, 83, 0.55);
            background: rgba(0, 200, 83, 0.16);
            color: #00c853;
            text-decoration: none;
            font-weight: 700;
            font-size: 13px;
          }

          small {
            color: #8390a0;
            font-size: 11px;
            max-width: 520px;
          }
        `}</style>
      </div>
    );
  }

  if (config.type === 'iframe') {
    return (
      <div className="embed-generic-frame">
        <iframe
          src={config.embedUrl}
          title={title || 'Conteúdo'}
          className="embed-iframe"
          allow="fullscreen"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          onError={() => setIframeError(true)}
        />
        {iframeError ? (
          <div className="frame-fallback">
            <p>Não foi possível carregar esse conteúdo aqui.</p>
            <a href={config.sourceUrl} target="_blank" rel="noopener noreferrer">
              Abrir externamente →
            </a>
          </div>
        ) : null}
        <style jsx>{`
          .embed-generic-frame {
            width: 100%;
            height: min(70vh, 740px);
            border-radius: var(--card-radius, 1rem);
            overflow: hidden;
            background: #fff;
            border: 1px solid rgba(0, 0, 0, 0.08);
            position: relative;
          }

          .embed-iframe {
            width: 100%;
            height: 100%;
            border: 0;
            display: block;
          }

          .frame-fallback {
            position: absolute;
            inset: 0;
            background: rgba(8, 8, 8, 0.92);
            color: #f3f3f3;
            display: grid;
            place-content: center;
            gap: 10px;
            text-align: center;
            padding: 20px;
          }

          .frame-fallback p {
            margin: 0;
            font-size: 14px;
            color: #c0c0c0;
          }

          .frame-fallback a {
            justify-self: center;
            border-radius: 10px;
            padding: 10px 13px;
            border: 1px solid rgba(0, 200, 83, 0.55);
            background: rgba(0, 200, 83, 0.16);
            color: #00c853;
            text-decoration: none;
            font-weight: 700;
            font-size: 13px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="unsupported-shell">
      <span className="unsupported-icon">🔗</span>
      <p>Conteúdo não pode ser exibido aqui.</p>
      {config.sourceUrl ? (
        <a href={config.sourceUrl} target="_blank" rel="noopener noreferrer">
          Abrir externamente →
        </a>
      ) : null}

      <style jsx>{`
        .unsupported-shell {
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: var(--card-radius, 1rem);
          background: #0f1113;
          border: 1px solid #2f363d;
          color: #f3f3f3;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          text-align: center;
          padding: 20px;
        }

        .unsupported-icon {
          font-size: 34px;
        }

        p {
          margin: 0;
          font-size: 14px;
          color: #a2abb4;
        }

        a {
          border-radius: 10px;
          padding: 10px 13px;
          border: 1px solid rgba(0, 200, 83, 0.55);
          background: rgba(0, 200, 83, 0.16);
          color: #00c853;
          text-decoration: none;
          font-weight: 700;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}
