'use client';

import { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import styles from './patrimony.module.css';

export default function ShareSheet({ onClose, userId }) {
  const [showValues, setShowValues] = useState(false);
  const [headline, setHeadline] = useState('highlight');
  const [retry, setRetry] = useState(0);
  const [previewState, setPreviewState] = useState('loading');
  const [busy, setBusy] = useState(false);
  const url = useMemo(() => {
    const params = new URLSearchParams({
      from: 'baseline',
      to: 'current',
      show_values: showValues ? '1' : '0',
      headline,
      retry: String(retry)
    });
    if (userId) params.set('user_id', userId);
    return `/api/patrimony/share-image?${params}`;
  }, [showValues, headline, retry, userId]);

  function reloadPreview() {
    setPreviewState('loading');
    setRetry((value) => value + 1);
  }

  async function getImage() {
    const response = await fetch(url, { cache: 'no-store' });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !contentType.startsWith('image/png')) {
      const payload = contentType.includes('json') ? await response.json().catch(() => ({})) : {};
      throw new Error(payload.error || 'Não foi possível gerar a imagem.');
    }
    return response.blob();
  }

  async function download(share = false) {
    setBusy(true);
    try {
      const blob = await getImage();
      const file = new File([blob], 'minha-evolucao.png', { type: 'image/png' });
      if (share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Minha evolução financeira' });
        return;
      }
      const anchor = document.createElement('a');
      anchor.href = URL.createObjectURL(blob);
      anchor.download = file.name;
      anchor.click();
      URL.revokeObjectURL(anchor.href);
      if (share) toast.success('Imagem baixada. Agora você pode compartilhá-la.');
    } catch (error) {
      toast.error(error.message);
      setPreviewState('error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.sheetBackdrop}>
      <section className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="share-title">
        <h2 id="share-title">Compartilhar evolução</h2>
        <div style={{ width: 252, maxWidth: '100%', aspectRatio: '9/16', margin: 'auto', position: 'relative' }}>
          {previewState === 'loading' ? <div className={styles.skeleton} style={{ height: '100%' }} aria-label="Gerando prévia" /> : null}
          {previewState === 'error' ? (
            <div className={styles.error} style={{ height: '100%', display: 'grid', alignContent: 'center', textAlign: 'center' }}>
              <p>Não foi possível gerar a prévia.</p>
              <button className={`${styles.button} ${styles.secondary}`} onClick={reloadPreview}>Tentar novamente</button>
            </div>
          ) : null}
          <img
            className={styles.sharePreview}
            style={{ display: previewState === 'error' ? 'none' : 'block', width: '100%', height: '100%', objectFit: 'cover' }}
            src={url}
            alt="Prévia da imagem para compartilhar"
            onLoad={() => setPreviewState('ready')}
            onError={() => setPreviewState('error')}
          />
        </div>
        <label><input type="checkbox" checked={showValues} onChange={(event) => { setPreviewState('loading'); setShowValues(event.target.checked); }} /> Mostrar valores em R$</label>
        <p className={styles.muted}>Desligado: só percentuais. Ninguém vê quanto você deve.</p>
        <div className={styles.toolbar}>
          {['highlight', 'progress'].map((key) => (
            <button key={key} onClick={() => { setPreviewState('loading'); setHeadline(key); }} className={`${styles.filter} ${headline === key ? styles.active : ''}`}>
              {key === 'highlight' ? 'Destaque' : 'Progresso'}
            </button>
          ))}
        </div>
        <div className={styles.row}>
          <button className={`${styles.button} ${styles.secondary}`} onClick={onClose}>Fechar</button>
          <button className={`${styles.button} ${styles.secondary}`} disabled={busy || previewState !== 'ready'} onClick={() => download(false)}>{busy ? 'Gerando…' : 'Baixar imagem'}</button>
          <button className={styles.button} disabled={busy || previewState !== 'ready'} onClick={() => download(true)}>{busy ? 'Gerando…' : 'Compartilhar'}</button>
        </div>
      </section>
    </div>
  );
}
