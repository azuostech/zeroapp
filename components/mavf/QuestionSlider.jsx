// components/mavf/QuestionSlider.jsx
'use client';

import { useEffect, useState } from 'react';
import styles from './question-slider.module.css';

const SCORE_LABELS = [
  'Muito insatisfeito',
  'Muito baixo',
  'Baixo',
  'Precisa de atenção',
  'Abaixo do esperado',
  'Regular',
  'Razoável',
  'Bom',
  'Muito bom',
  'Excelente',
  'Plenamente satisfeito'
];

export default function QuestionSlider({ 
  pillar, 
  sessionId, 
  initialScore = null,
  onSubmit,
  disabled = false,
  targetUserId = null
}) {
  const [score, setScore] = useState(initialScore ?? 5);
  const [hasInteracted, setHasInteracted] = useState(initialScore !== null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setScore(initialScore ?? 5);
    setHasInteracted(initialScore !== null);
    setSaved(false);
  }, [initialScore, pillar.id, sessionId]);

  const handleSubmit = async () => {
    if (!hasInteracted) return;
    setLoading(true);
    setSaved(false);

    try {
      const res = await fetch('/api/mavf/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          pillar: pillar.id,
          score,
          user_id: targetUserId || null
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSaved(true);
        onSubmit?.(score, data.progress);
        
      } else {
        alert(data.error || 'Erro ao salvar resposta');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro de conexão');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.card} aria-labelledby={`pillar-${pillar.id}`}>
      <header className={styles.header}>
        <div className={styles.emoji}>{pillar.emoji}</div>
        <div>
          <p className={styles.eyebrow}>Pilar liberado agora</p>
          <h3 id={`pillar-${pillar.id}`}>{pillar.label}</h3>
          <p>Deslize para avaliar de 0 a 10</p>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.scorePanel}>
          <div className={styles.scoreOutput}>
            <div>
              <span>Sua pontuação</span>
              <strong>{hasInteracted ? SCORE_LABELS[score] : 'Deslize para escolher'}</strong>
            </div>
            <output className={styles.scoreNumber} htmlFor={`score-${pillar.id}`}>{score}</output>
          </div>

          <input
            id={`score-${pillar.id}`}
            type="range"
            min="0"
            max="10"
            step="1"
            value={score}
            disabled={disabled || loading}
            onChange={(event) => {
              setScore(Number(event.target.value));
              setHasInteracted(true);
              setSaved(false);
            }}
            className={styles.slider}
            style={{ '--score-percent': `${score * 10}%` }}
            aria-label={`Pontuação do pilar ${pillar.label}`}
          />
          <div className={styles.scale}><span>0 · Muito baixo</span><span>5</span><span>10 · Excelente</span></div>
          {!hasInteracted ? <p className={styles.hint}>Mova o controle para registrar sua escolha.</p> : null}
        </div>

      {pillar.questions && (
        <div className={styles.reflection}>
          <p className={styles.reflectionTitle}>Antes de responder, reflita sobre</p>
          <ul>
            {pillar.questions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={disabled || loading || saved || !hasInteracted}
        className={styles.submit}
      >
        {loading ? 'Salvando...' : saved ? '✓ Resposta Salva!' : 'Confirmar Resposta'}
      </button>

      {saved && (
        <div className={styles.success}>
          <div>✓</div>
          <div>
            <strong>Resposta salva com sucesso!</strong>
            Aguarde a liberação do próximo pilar.
          </div>
        </div>
      )}
      </div>
    </section>
  );
}
