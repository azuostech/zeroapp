'use client';

import { Maximize2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VideoPlayer } from '@/components/ui/VideoPlayer';

function normalizeUrl(url) {
  return String(url || '').trim();
}

function buildYouTubeEmbedUrl(videoId) {
  const params = new URLSearchParams({
    autoplay: '0',
    controls: '1',
    disablekb: '0',
    fs: '0',
    iv_load_policy: '3',
    modestbranding: '1',
    playsinline: '1',
    rel: '0'
  });

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
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
      embedUrl: buildYouTubeEmbedUrl(ytMatch[1])
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
  const [isLandscape, setIsLandscape] = useState(false);
  const videoFrameRef = useRef(null);
  const config = useMemo(() => getEmbedConfig(url, contentType), [contentType, url]);

  useEffect(() => {
    if (!isLandscape) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isLandscape]);

  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsLandscape(false);
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  const closeLandscapeMode = useCallback(async () => {
    setIsLandscape(false);

    try {
      window.screen?.orientation?.unlock?.();
    } catch (_) {
      // Alguns navegadores nao permitem liberar orientacao via script.
    }

    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (_) {
        // O modo fixo do app continua funcionando mesmo sem a API de fullscreen.
      }
    }
  }, []);

  const openLandscapeMode = useCallback(async () => {
    setIsLandscape(true);

    if (videoFrameRef.current?.requestFullscreen) {
      try {
        await videoFrameRef.current.requestFullscreen();
      } catch (_) {
        // Sem fullscreen nativo, o container fixo ainda ocupa a tela do app.
      }
    }

    try {
      await window.screen?.orientation?.lock?.('landscape');
    } catch (_) {
      // iOS/Safari normalmente bloqueiam isso; o CSS rotaciona em retrato.
    }
  }, []);

  const toggleLandscapeMode = useCallback(() => {
    if (isLandscape) {
      closeLandscapeMode();
      return;
    }

    openLandscapeMode();
  }, [closeLandscapeMode, isLandscape, openLandscapeMode]);

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
    const isYouTube = config.type === 'youtube';

    return (
      <div
        ref={videoFrameRef}
        className={`embed-video-frame ${isYouTube ? 'is-youtube' : ''} ${isLandscape ? 'is-landscape' : ''}`}
      >
        <div className="embed-media-box">
          <iframe
            src={config.embedUrl}
            title={title || 'Conteúdo em vídeo'}
            className="embed-iframe"
            allow={
              isYouTube
                ? 'accelerometer; autoplay; encrypted-media; picture-in-picture'
                : 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen'
            }
            allowFullScreen={!isYouTube}
            frameBorder="0"
            sandbox={isYouTube ? 'allow-scripts allow-same-origin allow-presentation' : undefined}
            onError={() => setIframeError(true)}
          />
        </div>
        <button
          type="button"
          className="landscape-toggle"
          onClick={toggleLandscapeMode}
          aria-label={isLandscape ? 'Fechar modo horizontal' : 'Ver vídeo na horizontal'}
          aria-pressed={isLandscape}
          title={isLandscape ? 'Fechar modo horizontal' : 'Ver vídeo na horizontal'}
        >
          {isLandscape ? <X size={22} /> : <Maximize2 size={20} />}
        </button>
        <style jsx>{`
          .embed-video-frame {
            width: 100%;
            aspect-ratio: 16 / 9;
            border-radius: var(--card-radius, 1rem);
            overflow: hidden;
            background: #000;
            position: relative;
          }

          .embed-media-box {
            width: 100%;
            height: 100%;
            background: #000;
            position: relative;
          }

          .embed-iframe {
            width: 100%;
            height: 100%;
            border: 0;
            display: block;
          }

          .landscape-toggle {
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 4;
            width: 42px;
            height: 42px;
            border: 1px solid rgba(255, 255, 255, 0.24);
            border-radius: 50%;
            background: rgba(0, 0, 0, 0.72);
            color: #fff;
            display: grid;
            place-items: center;
            cursor: pointer;
            backdrop-filter: blur(10px);
            transition:
              background 0.2s ease,
              transform 0.2s ease;
          }

          .landscape-toggle:hover {
            background: rgba(0, 0, 0, 0.9);
            transform: scale(1.03);
          }

          .embed-video-frame.is-landscape {
            position: fixed;
            inset: 0;
            z-index: 1000;
            width: 100vw;
            height: 100dvh;
            aspect-ratio: auto;
            border-radius: 0;
            display: grid;
            place-items: center;
            overflow: hidden;
            background: #000;
            padding:
              env(safe-area-inset-top)
              env(safe-area-inset-right)
              env(safe-area-inset-bottom)
              env(safe-area-inset-left);
          }

          .embed-video-frame.is-landscape .embed-media-box {
            width: min(100vw, calc(100dvh * 16 / 9));
            height: auto;
            max-height: 100dvh;
            aspect-ratio: 16 / 9;
          }

          .embed-video-frame.is-landscape .landscape-toggle {
            top: max(12px, env(safe-area-inset-top));
            right: max(12px, env(safe-area-inset-right));
            width: 44px;
            height: 44px;
          }

          @media (orientation: portrait) {
            .embed-video-frame.is-landscape .embed-media-box {
              width: min(100dvh, calc(100vw * 16 / 9));
              transform: rotate(90deg);
            }
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
