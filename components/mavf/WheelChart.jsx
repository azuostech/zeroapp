'use client';

import { useEffect, useRef } from 'react';
import { MAVF_PILLARS } from '@/lib/mavf-config';

export default function WheelChart({ sessions = [], responsesMap = {} }) {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrapper || !canvas) return undefined;

    const draw = () => {
      const width = wrapper.clientWidth || 320;
      const size = Math.max(240, Math.min(width, 620));
      const devicePixelRatio = window.devicePixelRatio || 1;

      canvas.width = Math.floor(size * devicePixelRatio);
      canvas.height = Math.floor(size * devicePixelRatio);
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      ctx.clearRect(0, 0, size, size);

      const center = size / 2;
      const maxRadius = Math.max(70, Math.min(size * 0.31, center - 62));
      const labelDistance = maxRadius + Math.max(30, size * 0.062);
      const rootStyle = window.getComputedStyle(document.documentElement);
      const ringColor = rootStyle.getPropertyValue('--border-strong').trim() || '#cccccc';
      const axisColor = rootStyle.getPropertyValue('--border-strong').trim() || '#cccccc';
      const emojiColor = rootStyle.getPropertyValue('--text-2').trim() || 'currentColor';
      const labelColor = rootStyle.getPropertyValue('--muted').trim() || 'currentColor';
      const scaleColor = rootStyle.getPropertyValue('--green-darker').trim() || '#007a32';
      const cardColor = rootStyle.getPropertyValue('--bg-card').trim() || '#ffffff';

      for (let step = 2; step <= 10; step += 2) {
        const ringRadius = (step / 10) * maxRadius;
        ctx.beginPath();
        ctx.arc(center, center, ringRadius, 0, 2 * Math.PI);
        ctx.strokeStyle = ringColor;
        ctx.globalAlpha = step === 10 ? 0.85 : 0.55;
        ctx.lineWidth = step === 10 ? 1.4 : 0.9;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      MAVF_PILLARS.forEach((pillar) => {
        const angle = (pillar.angle - 90) * (Math.PI / 180);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const x = center + maxRadius * cos;
        const y = center + maxRadius * sin;

        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.lineTo(x, y);
        ctx.strokeStyle = axisColor;
        ctx.globalAlpha = 0.72;
        ctx.lineWidth = 1;
        ctx.setLineDash([]);
        ctx.stroke();
        ctx.globalAlpha = 1;

        for (let step = 2; step <= 10; step += 2) {
          const tickRadius = (step / 10) * maxRadius;
          const tickX = center + tickRadius * cos;
          const tickY = center + tickRadius * sin;
          ctx.beginPath();
          ctx.arc(tickX, tickY, step === 10 ? 2.2 : 1.6, 0, 2 * Math.PI);
          ctx.fillStyle = axisColor;
          ctx.fill();
        }

        let labelAlign = 'center';
        let labelX = center + labelDistance * cos;
        const labelY = center + labelDistance * sin;

        if (cos >= 0.35) {
          labelAlign = 'left';
          labelX += 6;
        } else if (cos <= -0.35) {
          labelAlign = 'right';
          labelX -= 6;
        }

        ctx.textAlign = labelAlign;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = emojiColor;
        ctx.font = `${size < 380 ? 13 : 14}px Sora`;
        ctx.fillText(pillar.emoji, labelX, labelY - 10);

        ctx.fillStyle = labelColor;
        ctx.font = `${size < 380 ? 9 : 10}px Sora`;
        ctx.fillText(pillar.label.toUpperCase(), labelX, labelY + 8);
      });

      // Escala numerica compartilhada por todos os 11 eixos.
      // As marcas de cada raio repetem os mesmos intervalos 0, 2, 4, 6, 8 e 10.
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${size < 380 ? 8 : 9}px Sora`;
      [0, 2, 4, 6, 8, 10].forEach((step) => {
        const radius = (step / 10) * maxRadius;
        const label = String(step);
        const x = center + 5;
        const y = center - radius;
        const width = ctx.measureText(label).width + 6;
        ctx.fillStyle = cardColor;
        ctx.globalAlpha = 0.88;
        ctx.fillRect(x - 2, y - 6, width, 12);
        ctx.globalAlpha = 1;
        ctx.fillStyle = scaleColor;
        ctx.fillText(label, x + 1, y);
      });

      sessions.forEach((session) => {
        const sessionResponses = responsesMap[session.id] || [];
        if (!sessionResponses.length) return;

        const points = [];
        ctx.beginPath();
        let firstPoint = true;

        MAVF_PILLARS.forEach((pillar) => {
          const response = sessionResponses.find((item) => item.pillar === pillar.id);
          const score = Number(response?.score || 0);
          const angle = (pillar.angle - 90) * (Math.PI / 180);
          const radius = (score / 10) * maxRadius;
          const px = center + radius * Math.cos(angle);
          const py = center + radius * Math.sin(angle);
          points.push({ px, py });

          if (firstPoint) {
            ctx.moveTo(px, py);
            firstPoint = false;
          } else {
            ctx.lineTo(px, py);
          }
        });

        ctx.closePath();
        ctx.strokeStyle = session.color_hex;
        ctx.lineWidth = 2.8;
        ctx.fillStyle = `${session.color_hex}25`;
        ctx.stroke();
        ctx.fill();

        points.forEach(({ px, py }) => {
          ctx.beginPath();
          ctx.arc(px, py, size < 380 ? 2.8 : 3.5, 0, 2 * Math.PI);
          ctx.fillStyle = session.color_hex;
          ctx.fill();
          ctx.strokeStyle = cardColor;
          ctx.lineWidth = 1.4;
          ctx.stroke();
        });
      });
    };

    draw();

    const observer = new ResizeObserver(() => draw());
    observer.observe(wrapper);
    window.addEventListener('resize', draw);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', draw);
    };
  }, [sessions, responsesMap]);

  return (
    <div className="wheel-container">
      <div className="wheel-wrapper" ref={wrapperRef}>
        <canvas
          ref={canvasRef}
          className="wheel-canvas"
          role="img"
          aria-label={`Gráfico circular MAVF na escala de zero a dez comparando ${sessions.map((session) => session.title).join(', ')}`}
        />
      </div>

      <style jsx>{`
        .wheel-container {
          width: 100%;
        }

        .wheel-wrapper {
          width: 100%;
          max-width: 620px;
          margin: 0 auto;
          aspect-ratio: 1 / 1;
          padding: 6px;
        }

        .wheel-canvas {
          width: 100%;
          height: auto;
          display: block;
        }
      `}</style>
    </div>
  );
}
