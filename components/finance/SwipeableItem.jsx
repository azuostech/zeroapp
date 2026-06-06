'use client';

import { useCallback, useRef, useState } from 'react';
import { useSwipeDelete } from '@/hooks/useSwipeDelete';

let activeSwipeReset = null;

export default function SwipeableItem({ children, itemName, onDelete, disabled = false }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const resetRef = useRef(null);

  const handleReveal = useCallback(() => {
    if (activeSwipeReset && activeSwipeReset !== resetRef.current) {
      activeSwipeReset();
    }
    activeSwipeReset = resetRef.current;
    setShowConfirm(true);
  }, []);

  const { rowRef, bgRef, reset, bind } = useSwipeDelete({
    threshold: 72,
    maxSwipe: 88,
    onReveal: handleReveal,
    onReset: () => {
      if (activeSwipeReset === resetRef.current) activeSwipeReset = null;
    }
  });
  resetRef.current = reset;

  const handleCancel = useCallback(() => {
    setShowConfirm(false);
    reset();
  }, [reset]);

  const handleConfirm = useCallback(async () => {
    setIsDeleting(true);
    setShowConfirm(false);
    try {
      await onDelete?.();
    } catch (error) {
      console.error('[SwipeableItem] Erro ao excluir:', error);
      reset();
    } finally {
      setIsDeleting(false);
    }
  }, [onDelete, reset]);

  return (
    <>
      <div className="swipe-container swipeable-item">
        <div ref={bgRef} className="swipe-delete-bg">
          <div>
            <span>🗑</span>
            <strong>Excluir</strong>
          </div>
        </div>
        <div ref={rowRef} className="swipe-row" style={{ opacity: isDeleting ? 0.5 : 1 }} {...(disabled ? {} : bind)}>
          {children}
        </div>
        <div className="swipe-hint">← deslize para excluir</div>
      </div>

      {showConfirm ? (
        <div className="swipe-confirm-overlay" onClick={handleCancel}>
          <div className="swipe-confirm-sheet" onClick={(event) => event.stopPropagation()}>
            <div className="swipe-confirm-handle" />
            <h3>Excluir item?</h3>
            <p>"{itemName}" será removido da lista. Esta ação não pode ser desfeita.</p>
            <div className="swipe-confirm-actions">
              <button type="button" className="btn-cancel" onClick={handleCancel}>
                Cancelar
              </button>
              <button type="button" className="btn-delete" onClick={handleConfirm} disabled={isDeleting}>
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <style jsx>{`
        .swipe-container {
          position: relative;
          border-radius: 14px;
          overflow: hidden;
          user-select: none;
          -webkit-user-select: none;
        }

        .swipe-delete-bg {
          position: absolute;
          inset: 0;
          background: #ff3b30;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 22px;
          opacity: 0;
        }

        .swipe-delete-bg div {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          color: #fff;
        }

        .swipe-delete-bg strong {
          font-size: 10px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        .swipe-row {
          position: relative;
          z-index: 2;
          will-change: transform;
          -webkit-tap-highlight-color: transparent;
        }

        .swipe-hint {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          z-index: 3;
          border: 1px solid rgba(255, 59, 48, 0.25);
          border-radius: 8px;
          background: rgba(255, 59, 48, 0.12);
          color: #ff3b30;
          padding: 3px 8px;
          font-size: 10px;
          font-weight: 700;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.2s;
        }

        @media (hover: hover) {
          .swipe-container:hover .swipe-hint {
            opacity: 1;
          }
        }

        .swipe-confirm-overlay {
          position: fixed;
          inset: 0;
          z-index: 500;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          background: rgba(0, 0, 0, 0.7);
        }

        .swipe-confirm-sheet {
          width: 100%;
          max-width: 480px;
          border-top: 1px solid #2a2a2a;
          border-radius: 24px 24px 0 0;
          background: #1a1a1a;
          padding: 0 20px 36px;
        }

        .swipe-confirm-handle {
          width: 40px;
          height: 4px;
          border-radius: 2px;
          background: #333;
          margin: 12px auto 16px;
        }

        h3 {
          margin: 0 0 6px;
          color: #f0f0f0;
          font-size: 17px;
        }

        p {
          margin: 0 0 20px;
          color: #888;
          font-size: 13px;
          line-height: 1.6;
        }

        .swipe-confirm-actions {
          display: flex;
          gap: 10px;
        }

        button {
          flex: 1;
          border: 1px solid #333;
          border-radius: 12px;
          padding: 14px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-cancel {
          background: #2a2a2a;
          color: #f0f0f0;
        }

        .btn-delete {
          border-color: #ff3b30;
          background: #ff3b30;
          color: #fff;
        }
      `}</style>
    </>
  );
}
