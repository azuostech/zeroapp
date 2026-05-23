'use client';

import * as React from 'react';
import { cva } from 'class-variance-authority';
import { Maximize, Minimize, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

const rootVariants = cva('video-player-root', {
  variants: {
    size: {
      full: 'size-full',
      compact: 'size-compact'
    }
  },
  defaultVariants: {
    size: 'full'
  }
});

const VideoPlayer = React.forwardRef(function VideoPlayer(
  { src, poster, showControls = true, autoHide = true, size = 'full', className, ...props },
  ref
) {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(false);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const [showControlsState, setShowControlsState] = React.useState(true);

  const videoRef = React.useRef(null);
  const containerRef = React.useRef(null);
  const hideTimeoutRef = React.useRef(null);

  React.useImperativeHandle(ref, () => videoRef.current);

  const formatTime = (secondsRaw) => {
    const secondsSafe = Number.isFinite(secondsRaw) ? secondsRaw : 0;
    const minutes = Math.floor(secondsSafe / 60);
    const seconds = Math.floor(secondsSafe % 60);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const clearHideTimeout = React.useCallback(() => {
    if (!hideTimeoutRef.current) return;
    clearTimeout(hideTimeoutRef.current);
    hideTimeoutRef.current = null;
  }, []);

  const resetHideTimeout = React.useCallback(() => {
    clearHideTimeout();
    if (autoHide && isPlaying) {
      hideTimeoutRef.current = setTimeout(() => {
        setShowControlsState(false);
      }, 3000);
    }
  }, [autoHide, clearHideTimeout, isPlaying]);

  const togglePlay = React.useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }, []);

  const toggleMute = React.useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  }, []);

  const handleVolumeChange = React.useCallback((event) => {
    const nextVolume = Number.parseFloat(event.target.value);
    const safeVolume = Number.isFinite(nextVolume) ? Math.max(0, Math.min(1, nextVolume)) : 0;
    setVolume(safeVolume);

    if (!videoRef.current) return;
    videoRef.current.volume = safeVolume;
    videoRef.current.muted = safeVolume === 0;
    setIsMuted(videoRef.current.muted);
  }, []);

  const handleSeek = React.useCallback((event) => {
    const nextTime = Number.parseFloat(event.target.value);
    const safeTime = Number.isFinite(nextTime) ? Math.max(0, nextTime) : 0;
    setCurrentTime(safeTime);
    if (!videoRef.current) return;
    videoRef.current.currentTime = safeTime;
  }, []);

  const toggleFullscreen = React.useCallback(async () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
      } catch (_) {
        // no-op
      }
      return;
    }

    try {
      await document.exitFullscreen();
    } catch (_) {
      // no-op
    }
  }, []);

  const skip = React.useCallback(
    (seconds) => {
      if (!videoRef.current) return;
      const next = Math.max(0, Math.min(duration || 0, Number(videoRef.current.currentTime || 0) + seconds));
      videoRef.current.currentTime = next;
      setCurrentTime(next);
    },
    [duration]
  );

  const handleMouseMove = React.useCallback(() => {
    setShowControlsState(true);
    resetHideTimeout();
  }, [resetHideTimeout]);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    const onMeta = () => {
      setDuration(Number(video.duration || 0));
    };

    const onTime = () => {
      setCurrentTime(Number(video.currentTime || 0));
    };

    const onPlay = () => {
      setIsPlaying(true);
      resetHideTimeout();
    };

    const onPause = () => {
      setIsPlaying(false);
      setShowControlsState(true);
      clearHideTimeout();
    };

    const onVolume = () => {
      setVolume(Number(video.volume || 0));
      setIsMuted(Boolean(video.muted));
    };

    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('volumechange', onVolume);

    return () => {
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('volumechange', onVolume);
      clearHideTimeout();
    };
  }, [clearHideTimeout, resetHideTimeout]);

  React.useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePct = (isMuted ? 0 : volume) * 100;

  return (
    <div
      ref={containerRef}
      className={cn(rootVariants({ size }), className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => {
        if (autoHide && isPlaying) setShowControlsState(false);
      }}
      tabIndex={0}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="video-element"
        preload="metadata"
        onClick={togglePlay}
        {...props}
      />

      {showControls ? (
        <>
          <div className={cn('center-overlay', !isPlaying || showControlsState ? 'visible' : 'hidden')}>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                togglePlay();
              }}
              className="center-play-btn"
              aria-label={isPlaying ? 'Pausar vídeo' : 'Reproduzir vídeo'}
            >
              {isPlaying ? <Pause size={26} /> : <Play size={26} className="play-offset" />}
            </button>
          </div>

          <div className={cn('controls-overlay', showControlsState ? 'visible' : 'hidden')}>
            <div className="controls-wrap">
              <div className="progress-row">
                <span className="time-label">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="range progress-range"
                  style={{
                    background: `linear-gradient(to right, #00C853 0%, #00C853 ${progressPct}%, rgba(255,255,255,0.24) ${progressPct}%, rgba(255,255,255,0.24) 100%)`
                  }}
                />
                <span className="time-label">{formatTime(duration)}</span>
              </div>

              <div className="actions-row">
                <div className="left-actions">
                  <button type="button" className="icon-btn" onClick={() => skip(-10)} aria-label="Voltar 10 segundos">
                    <SkipBack size={17} />
                  </button>
                  <button type="button" className="icon-btn" onClick={togglePlay} aria-label={isPlaying ? 'Pausar vídeo' : 'Reproduzir vídeo'}>
                    {isPlaying ? <Pause size={17} /> : <Play size={17} className="play-offset-small" />}
                  </button>
                  <button type="button" className="icon-btn" onClick={() => skip(10)} aria-label="Avançar 10 segundos">
                    <SkipForward size={17} />
                  </button>

                  <div className="volume-wrap">
                    <button type="button" className="icon-btn" onClick={toggleMute} aria-label={isMuted ? 'Ativar som' : 'Silenciar'}>
                      {isMuted || volume === 0 ? <VolumeX size={17} /> : <Volume2 size={17} />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.1}
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="range volume-range"
                      style={{
                        background: `linear-gradient(to right, #ffffff 0%, #ffffff ${volumePct}%, rgba(255,255,255,0.24) ${volumePct}%, rgba(255,255,255,0.24) 100%)`
                      }}
                    />
                  </div>
                </div>

                <button type="button" className="icon-btn" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Sair da tela cheia' : 'Entrar em tela cheia'}>
                  {isFullscreen ? <Minimize size={17} /> : <Maximize size={17} />}
                </button>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <style jsx>{`
        .video-player-root {
          position: relative;
          width: 100%;
          overflow: hidden;
          border-radius: var(--card-radius, 1rem);
          background: #000;
        }

        .size-full {
          min-height: 240px;
        }

        .size-compact {
          min-height: 180px;
        }

        .video-element {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
          background: #000;
        }

        .center-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          transition: opacity 0.25s ease;
        }

        .controls-overlay {
          position: absolute;
          inset: auto 0 0 0;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.05) 0%, rgba(0, 0, 0, 0.78) 46%, rgba(0, 0, 0, 0.9) 100%);
          transition: opacity 0.25s ease;
        }

        .visible {
          opacity: 1;
        }

        .hidden {
          opacity: 0;
        }

        .center-play-btn {
          pointer-events: auto;
          width: 64px;
          height: 64px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(5px);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform 0.2s ease, background 0.2s ease;
        }

        .center-play-btn:hover {
          transform: scale(1.03);
          background: rgba(255, 255, 255, 0.26);
        }

        .play-offset {
          margin-left: 3px;
        }

        .play-offset-small {
          margin-left: 1px;
        }

        .controls-wrap {
          padding: 12px 14px;
          pointer-events: auto;
          color: #fff;
        }

        .progress-row {
          display: grid;
          grid-template-columns: 40px 1fr 40px;
          gap: 8px;
          align-items: center;
          margin-bottom: 10px;
        }

        .time-label {
          font-size: 11px;
          font-family: 'Space Mono', monospace;
          color: rgba(255, 255, 255, 0.86);
        }

        .actions-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }

        .left-actions {
          display: flex;
          align-items: center;
          gap: 3px;
          flex-wrap: wrap;
        }

        .icon-btn {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .icon-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .volume-wrap {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-left: 2px;
        }

        .range {
          appearance: none;
          height: 4px;
          border-radius: 999px;
          cursor: pointer;
          border: none;
          outline: none;
        }

        .range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: #fff;
          border: 0;
        }

        .range::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: #fff;
          border: 0;
        }

        .progress-range {
          width: 100%;
        }

        .volume-range {
          width: 74px;
        }

        @media (max-width: 760px) {
          .center-play-btn {
            width: 56px;
            height: 56px;
          }

          .controls-wrap {
            padding: 10px 10px 12px;
          }

          .progress-row {
            gap: 6px;
          }

          .time-label {
            font-size: 10px;
          }

          .volume-range {
            width: 58px;
          }

          .icon-btn {
            width: 31px;
            height: 31px;
            border-radius: 9px;
          }
        }
      `}</style>
    </div>
  );
});

export { VideoPlayer };
