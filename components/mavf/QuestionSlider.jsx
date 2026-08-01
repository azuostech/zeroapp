// components/mavf/QuestionSlider.jsx
'use client';

import { useEffect, useState } from 'react';

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
  const [score, setScore] = useState(initialScore);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setScore(initialScore);
    setSaved(false);
  }, [initialScore, pillar.id, sessionId]);

  const handleSubmit = async () => {
    if (score === null) return;
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
    <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-2xl p-4 md:p-8">
      
      {/* Emoji + Título */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">{pillar.emoji}</div>
        <h3 className="text-2xl font-bold text-[var(--text)] mb-2">{pillar.label}</h3>
        <p className="text-[var(--muted)]">Avalie de 0 a 10</p>
      </div>

      {/* Seletor de pontuação */}
      <div className="mb-8">
        <div className="rounded-[14px] border border-[var(--border)] bg-[var(--bg)] p-4 text-center mb-4">
          <div className="text-[11px] uppercase tracking-[0.8px] text-[var(--muted)] mb-1">Sua pontuação</div>
          <div className="text-[var(--green)] text-5xl font-black leading-none">{score ?? '—'}</div>
          <div className="text-sm font-semibold text-[var(--text-2)] mt-2">
            {score === null ? 'Toque em uma nota abaixo' : SCORE_LABELS[score]}
          </div>
        </div>

        <fieldset disabled={disabled || loading}>
          <legend className="sr-only">Escolha uma pontuação de zero a dez</legend>
          <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Pontuação de zero a dez">
            {Array.from({ length: 11 }, (_, value) => {
              const selected = score === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={`${value}: ${SCORE_LABELS[value]}`}
                  onClick={() => {
                    setScore(value);
                    setSaved(false);
                  }}
                  className={`min-h-12 rounded-[10px] border text-base font-black transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--green)] ${
                    selected
                      ? 'border-[var(--green)] bg-[var(--green)] text-[var(--text-on-green)] shadow-[var(--shadow-green)] scale-[1.04]'
                      : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-2)] hover:border-[var(--green)]'
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex justify-between text-[11px] text-[var(--muted)] mt-2 px-1">
          <span>0 · Muito baixo</span>
          <span>10 · Excelente</span>
        </div>
      </div>

      {/* Perguntas de Reflexão */}
      {pillar.questions && (
        <div className="mb-8 bg-[var(--bg)] rounded-xl p-4">
          <div className="text-xs text-[var(--muted)] mb-3 uppercase font-semibold">
            Reflita sobre:
          </div>
          <div className="space-y-2">
            {pillar.questions.map((q, i) => (
              <div key={i} className="text-sm text-[var(--text-2)] leading-relaxed">
                • {q}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botão Confirmar */}
      <button
        onClick={handleSubmit}
        disabled={disabled || loading || saved || score === null}
        className={`
          w-full font-bold py-4 rounded-xl text-base
          transition-all duration-200
          ${saved 
            ? 'bg-[var(--green)] text-[var(--bg)]' 
            : 'bg-gradient-to-r from-[var(--green)] to-[var(--gold)] text-[var(--bg)]'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
          hover:brightness-105 active:scale-[0.99]
        `}
      >
        {loading ? 'Salvando...' : saved ? '✓ Resposta Salva!' : 'Confirmar Resposta'}
      </button>

      {/* Toast de Sucesso */}
      {saved && (
        <div className="mt-4 bg-[var(--green-dim)] border border-[var(--green)] 
          rounded-xl p-3 flex items-center gap-3 animate-slide-up">
          <div className="text-xl">✓</div>
          <div>
            <div className="text-sm font-semibold text-[var(--green)]">
              Resposta salva com sucesso!
            </div>
            <div className="text-xs text-[var(--muted)]">Aguarde a liberação do próximo pilar.</div>
          </div>
        </div>
      )}
    </div>
  );
}
