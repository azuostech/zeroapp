'use client';

import { useEffect, useRef, useState } from 'react';

function detectPlatform() {
  const userAgent = window.navigator.userAgent || '';
  const isIPadOS = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;

  if (/iPhone|iPad|iPod/i.test(userAgent) || isIPadOS) return 'ios';
  if (/Android/i.test(userAgent)) return 'android';
  return 'other';
}

function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function InstallAppPrompt() {
  const deferredPromptRef = useRef(null);
  const [platform, setPlatform] = useState('checking');
  const [canPrompt, setCanPrompt] = useState(false);
  const [installed, setInstalled] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const resolvedPlatform = detectPlatform();
    const alreadyInstalled = isInstalled();
    const isMobileViewport = window.matchMedia('(max-width: 768px)').matches;

    setPlatform(resolvedPlatform);
    setInstalled(alreadyInstalled || (!isMobileViewport && resolvedPlatform === 'other'));

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      deferredPromptRef.current = event;
      setCanPrompt(true);
      setInstalled(false);
    };

    const handleInstalled = () => {
      deferredPromptRef.current = null;
      setCanPrompt(false);
      setInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    const deferredPrompt = deferredPromptRef.current;

    if (!deferredPrompt) {
      setShowInstructions((current) => !current);
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice.catch(() => null);

    deferredPromptRef.current = null;
    setCanPrompt(false);
    if (choice?.outcome === 'accepted') setInstalled(true);
  };

  if (installed || platform === 'checking') return null;

  const buttonLabel = canPrompt
    ? 'Instalar agora'
    : platform === 'ios'
      ? 'Como adicionar no iPhone'
      : 'Como instalar no celular';

  return (
    <section className="install-card" aria-label="Instalar ZeroApp no celular">
      <div className="install-copy">
        <span className="install-icon" aria-hidden="true">↧</span>
        <div>
          <strong>Use como aplicativo</strong>
          <p>Adicione o ZeroApp à tela inicial. Não precisa baixar pela loja.</p>
        </div>
      </div>

      <button type="button" className="install-button" onClick={handleInstall} aria-expanded={showInstructions}>
        {buttonLabel}
      </button>

      {showInstructions ? (
        <div className="install-instructions" role="status">
          {platform === 'ios' ? (
            <ol>
              <li>Abra esta página no Safari.</li>
              <li>Toque em <strong>Compartilhar</strong> (quadrado com seta para cima).</li>
              <li>Escolha <strong>Adicionar à Tela de Início</strong> e toque em <strong>Adicionar</strong>.</li>
            </ol>
          ) : (
            <ol>
              <li>Abra o menu do navegador (⋮).</li>
              <li>Toque em <strong>Instalar aplicativo</strong> ou <strong>Adicionar à tela inicial</strong>.</li>
              <li>Confirme para criar o ícone do ZeroApp.</li>
            </ol>
          )}
        </div>
      ) : null}

      <style jsx>{`
        .install-card {
          margin-top: 14px;
          padding: 15px;
          border: 1px solid rgba(0, 200, 83, 0.24);
          border-radius: var(--radius-lg);
          background: var(--bg-card);
          background: color-mix(in srgb, var(--bg-card) 92%, var(--green) 8%);
          box-shadow: var(--shadow-sm);
        }

        .install-copy {
          display: flex;
          align-items: flex-start;
          gap: 11px;
        }

        .install-icon {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: var(--green-dim);
          color: var(--green-dark);
          font-size: 22px;
          font-weight: 800;
        }

        strong {
          color: var(--text);
          font-size: 13px;
        }

        p {
          margin: 4px 0 0;
          color: var(--text-2);
          font-size: 11px;
          line-height: 1.5;
        }

        .install-button {
          width: 100%;
          min-height: 42px;
          margin-top: 12px;
          border: 1px solid var(--green);
          border-radius: var(--radius-md);
          background: transparent;
          color: var(--green-dark);
          font: inherit;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .install-button:hover,
        .install-button:focus-visible {
          background: var(--green-dim);
          outline: none;
        }

        .install-instructions {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border-2);
          color: var(--text-2);
          font-size: 11px;
          line-height: 1.55;
        }

        ol {
          margin: 0;
          padding-left: 19px;
        }

        li + li {
          margin-top: 5px;
        }

        .install-instructions strong {
          font-size: inherit;
        }
      `}</style>
    </section>
  );
}
