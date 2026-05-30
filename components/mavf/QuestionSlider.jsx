// components/mavf/QuestionSlider.jsx
'use client';

import { useState } from 'react';

export default function QuestionSlider({ 
  pillar, 
  sessionId, 
  initialScore = 5,
  onSubmit,
  disabled = false,
  targetUserId = null
}) {
  const [score, setScore] = useState(initialScore);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async () => {
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
        
        // Reset saved state após 3 segundos
        setTimeout(() => setSaved(false), 3000);
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
    <div className="bg-[var(--bg2)] border border-[var(--border)] rounded-2xl p-8">
      
      {/* Emoji + Título */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">{pillar.emoji}</div>
        <h3 className="text-2xl font-bold text-[var(--text)] mb-2">{pillar.label}</h3>
        <p className="text-[var(--muted)]">Avalie de 0 a 10</p>
      </div>

      {/* Slider */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-[var(--muted)] mb-2">
          <span>0</span>
          <span className="text-[var(--green)] text-4xl font-bold">{score}</span>
          <span>10</span>
        </div>
        <input
          type="range"
          min="0"
          max="10"
          step="1"
          value={score}
          onChange={(e) => setScore(parseInt(e.target.value))}
          disabled={disabled || loading}
          className="w-full h-3 rounded-full appearance-none cursor-pointer
            bg-[var(--border)] accent-[var(--green)] 
            disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, var(--green) 0%, var(--green) ${score * 10}%, var(--border) ${score * 10}%, var(--border) 100%)`
          }}
        />
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
        disabled={disabled || loading || saved}
        className={`
          w-full font-bold py-4 rounded-xl text-base
          transition-all duration-200
          ${saved 
            ? 'bg-[var(--green)] text-[var(--bg)]' 
            : 'bg-gradient-to-r from-[var(--green)] to-[var(--gold)] text-[var(--bg)]'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
          hover:scale-105 active:scale-95
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
            <div className="text-xs text-[var(--muted)]">
              Continue para o próximo pilar
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
