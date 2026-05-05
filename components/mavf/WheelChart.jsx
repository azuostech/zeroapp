// components/mavf/WheelChart.jsx
'use client';

import { useEffect, useRef } from 'react';
import { MAVF_PILLARS } from '@/lib/mavf-config';

export default function WheelChart({ sessions = [], responsesMap = {} }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 80;

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar círculos de referência (0, 2, 4, 6, 8, 10)
    ctx.strokeStyle = '#2a2a2a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= 10; i += 2) {
      const radius = (i / 10) * maxRadius;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }

    // Números de referência
    ctx.fillStyle = '#666';
    ctx.font = '11px DM Sans';
    ctx.textAlign = 'center';
    ctx.fillText('10', centerX, centerY - maxRadius + 15);
    ctx.fillText('5', centerX, centerY - (maxRadius / 2) + 5);

    // Desenhar linhas dos pilares
    MAVF_PILLARS.forEach(pillar => {
      const angle = (pillar.angle - 90) * (Math.PI / 180);
      const x = centerX + maxRadius * Math.cos(angle);
      const y = centerY + maxRadius * Math.sin(angle);

      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.strokeStyle = '#444';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([2, 2]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label do pilar (fora do círculo)
      const labelX = centerX + (maxRadius + 50) * Math.cos(angle);
      const labelY = centerY + (maxRadius + 50) * Math.sin(angle);
      ctx.fillStyle = '#aaa';
      ctx.font = '11px DM Sans';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${pillar.emoji} ${pillar.label}`, labelX, labelY);
    });

    // Desenhar cada sessão como uma linha colorida
    sessions.forEach(session => {
      const sessionResponses = responsesMap[session.id] || [];
      if (sessionResponses.length === 0) return;

      ctx.strokeStyle = session.color_hex;
      ctx.lineWidth = 2.5;
      ctx.fillStyle = session.color_hex + '20'; // 20 = alpha 12%
      ctx.beginPath();

      let firstPoint = true;
      MAVF_PILLARS.forEach((pillar) => {
        const response = sessionResponses.find(r => r.pillar === pillar.id);
        const score = response?.score || 0;
        const radius = (score / 10) * maxRadius;
        const angle = (pillar.angle - 90) * (Math.PI / 180);
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);

        if (firstPoint) {
          ctx.moveTo(x, y);
          firstPoint = false;
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.closePath();
      ctx.stroke();
      ctx.fill();
    });

  }, [sessions, responsesMap]);

  return (
    <div className="relative w-full aspect-square max-w-2xl mx-auto">
      <canvas
        ref={canvasRef}
        width={800}
        height={800}
        className="w-full h-full"
      />
    </div>
  );
}
