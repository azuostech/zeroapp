// components/mavf/QuestionSlider.jsx
'use client';

import { useState } from 'react';

export default function QuestionSlider({ 
  pillar, 
  sessionId, 
  initialScore = 5,
  onSubmit,
  disabled = false
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
          score
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
    <div className="bg-[#1a1a1a] border border-[#333] rounded-2xl p-8">
      
      {/* Emoji + Título */}
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">{pillar.emoji}</div>
        <h3 className="text-2xl font-bold text-white mb-2">{pillar.label}</h3>
        <p className="text-[#888]">Avalie de 0 a 10</p>
      </div>

      {/* Slider */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-[#888] mb-2">
          <span>0</span>
          <span className="text-[#00C853] text-4xl font-bold">{score}</span>
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
            bg-[#333] accent-[#00C853] 
            disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, #00C853 0%, #00C853 ${score * 10}%, #333 ${score * 10}%, #333 100%)`
          }}
        />
      </div>

      {/* Perguntas de Reflexão */}
      {pillar.questions && (
        <div className="mb-8 bg-[#0a0a0a] rounded-xl p-4">
          <div className="text-xs text-[#888] mb-3 uppercase font-semibold">
            Reflita sobre:
          </div>
          <div className="space-y-2">
            {pillar.questions.map((q, i) => (
              <div key={i} className="text-sm text-[#aaa] leading-relaxed">
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
            ? 'bg-[#00C853] text-white' 
            : 'bg-gradient-to-r from-[#00C853] to-[#FFD700] text-[#0a0a0a]'
          }
          disabled:opacity-50 disabled:cursor-not-allowed
          hover:scale-105 active:scale-95
        `}
      >
        {loading ? 'Salvando...' : saved ? '✓ Resposta Salva!' : 'Confirmar Resposta'}
      </button>

      {/* Toast de Sucesso */}
      {saved && (
        <div className="mt-4 bg-[rgba(0,200,83,0.15)] border border-[#00C853] 
          rounded-xl p-3 flex items-center gap-3 animate-slide-up">
          <div className="text-xl">✓</div>
          <div>
            <div className="text-sm font-semibold text-[#00C853]">
              Resposta salva com sucesso!
            </div>
            <div className="text-xs text-[#888]">
              Continue para o próximo pilar
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
