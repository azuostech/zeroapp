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
      const size = Math.max(280, Math.min(width, 620));
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
      const maxRadius = Math.max(82, Math.min(size * 0.33, center - 58));
      const labelDistance = maxRadius + Math.max(30, size * 0.062);

      ctx.strokeStyle = '#2a2a2a';
      ctx.lineWidth = 1;
      for (let step = 2; step <= 10; step += 2) {
        const ringRadius = (step / 10) * maxRadius;
        ctx.beginPath();
        ctx.arc(center, center, ringRadius, 0, 2 * Math.PI);
        ctx.stroke();
      }

      MAVF_PILLARS.forEach((pillar) => {
        const angle = (pillar.angle - 90) * (Math.PI / 180);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const x = center + maxRadius * cos;
        const y = center + maxRadius * sin;

        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.lineTo(x, y);
        ctx.strokeStyle = '#3a3a3a';
        ctx.lineWidth = 0.75;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        let labelAlign = 'center';
        let labelX = center + labelDistance * cos;
        const labelY = center + labelDistance * sin;

        if (cos >= 0.35) {
          labelAlign = 'right';
          labelX -= 8;
        } else if (cos <= -0.35) {
          labelAlign = 'left';
          labelX += 8;
        }

        ctx.textAlign = labelAlign;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#b0b0b0';
        ctx.font = `${size < 380 ? 13 : 14}px Sora`;
        ctx.fillText(pillar.emoji, labelX, labelY - 10);

        ctx.fillStyle = '#8e8e8e';
        ctx.font = `${size < 380 ? 9 : 10}px Sora`;
        ctx.fillText(pillar.label.toUpperCase(), labelX, labelY + 8);
      });

      sessions.forEach((session) => {
        const sessionResponses = responsesMap[session.id] || [];
        if (!sessionResponses.length) return;

        ctx.beginPath();
        let firstPoint = true;

        MAVF_PILLARS.forEach((pillar) => {
          const response = sessionResponses.find((item) => item.pillar === pillar.id);
          const score = Number(response?.score || 0);
          const angle = (pillar.angle - 90) * (Math.PI / 180);
          const radius = (score / 10) * maxRadius;
          const px = center + radius * Math.cos(angle);
          const py = center + radius * Math.sin(angle);

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
        <canvas ref={canvasRef} className="wheel-canvas" />
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
