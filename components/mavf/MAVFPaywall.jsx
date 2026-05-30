// components/mavf/MAVFPaywall.jsx
'use client';

export default function MAVFPaywall({ currentTier = 'DESPERTAR' }) {
  return (
    <div className="w-full flex items-center justify-center py-6">
      <div className="max-w-lg w-full bg-[var(--bg2)] border-2 border-[var(--gold)] 
        rounded-2xl p-8 text-center">
        
        <div className="text-6xl mb-6">🔒</div>
        
        <h2 className="text-3xl font-bold mb-4">
          MAVF — Exclusivo Mentoria em Grupo
        </h2>
        
        <p className="text-[var(--muted)] mb-8 leading-relaxed">
          O Mapa de AutoAvaliação é uma ferramenta poderosa reservada para
          membros da Mentoria em Grupo (tier{' '}
          <strong className="text-[var(--green)]">MOVIMENTO</strong> ou superior).
        </p>

        <div className="bg-[var(--bg)] rounded-xl p-6 mb-8 text-left">
          <div className="text-sm font-semibold mb-4">
            O que você desbloqueia:
          </div>
          <div className="space-y-3 text-sm text-[var(--text-2)]">
            <div className="flex items-start gap-3">
              <span className="text-[var(--green)]">✓</span>
              <span>Sessões MAVF conduzidas ao vivo</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[var(--green)]">✓</span>
              <span>Roda da vida interativa no seu celular</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[var(--green)]">✓</span>
              <span>Comparação da sua evolução ao longo do tempo</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[var(--green)]">✓</span>
              <span>Insights personalizados sobre seus pilares</span>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg)] rounded-xl p-4 mb-6">
          <div className="text-xs text-[var(--muted)] mb-1">Seu tier atual:</div>
          <div className="text-lg font-bold text-[var(--gold)]">{currentTier}</div>
        </div>

        <button 
          className="w-full bg-gradient-to-r from-[var(--green)] to-[var(--gold)] 
            text-[var(--bg)] font-bold py-4 rounded-xl text-base mb-4
            hover:scale-105 transition-transform"
          onClick={() => alert('Redirecionar para página de upgrade')}
        >
          Fazer Upgrade para MOVIMENTO
        </button>
        
        <div className="text-xs text-[var(--muted)]">
          Ou use seu código do Workshop Finanças do Zero
        </div>
      </div>
    </div>
  );
}
