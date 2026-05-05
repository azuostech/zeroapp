// components/mavf/MAVFPaywall.jsx
'use client';

export default function MAVFPaywall({ currentTier = 'DESPERTAR' }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-[#1a1a1a] border-2 border-[#FFD700] 
        rounded-2xl p-8 text-center">
        
        <div className="text-6xl mb-6">🔒</div>
        
        <h2 className="text-3xl font-bold mb-4">
          MAVF — Exclusivo Mentoria em Grupo
        </h2>
        
        <p className="text-[#888] mb-8 leading-relaxed">
          O Mapa de AutoAvaliação é uma ferramenta poderosa reservada para
          membros da Mentoria em Grupo (tier{' '}
          <strong className="text-[#00C853]">MOVIMENTO</strong> ou superior).
        </p>

        <div className="bg-[#0a0a0a] rounded-xl p-6 mb-8 text-left">
          <div className="text-sm font-semibold mb-4">
            O que você desbloqueia:
          </div>
          <div className="space-y-3 text-sm text-[#aaa]">
            <div className="flex items-start gap-3">
              <span className="text-[#00C853]">✓</span>
              <span>Sessões MAVF conduzidas ao vivo</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#00C853]">✓</span>
              <span>Roda da vida interativa no seu celular</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#00C853]">✓</span>
              <span>Comparação da sua evolução ao longo do tempo</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-[#00C853]">✓</span>
              <span>Insights personalizados sobre seus pilares</span>
            </div>
          </div>
        </div>

        <div className="bg-[#0a0a0a] rounded-xl p-4 mb-6">
          <div className="text-xs text-[#888] mb-1">Seu tier atual:</div>
          <div className="text-lg font-bold text-[#FFD700]">{currentTier}</div>
        </div>

        <button 
          className="w-full bg-gradient-to-r from-[#00C853] to-[#FFD700] 
            text-[#0a0a0a] font-bold py-4 rounded-xl text-base mb-4
            hover:scale-105 transition-transform"
          onClick={() => alert('Redirecionar para página de upgrade')}
        >
          Fazer Upgrade para MOVIMENTO
        </button>
        
        <div className="text-xs text-[#888]">
          Ou use seu código do Workshop Finanças do Zero
        </div>
      </div>
    </div>
  );
}
