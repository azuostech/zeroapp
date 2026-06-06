'use client';

import { useCallback, useRef } from 'react';

function isInteractiveTarget(target) {
  return Boolean(target?.closest?.('button,input,select,textarea,label,a,[data-no-swipe="true"]'));
}

export function useSwipeDelete({ threshold = 72, maxSwipe = 88, onReveal, onReset } = {}) {
  const rowRef = useRef(null);
  const bgRef = useRef(null);
  const state = useRef({
    startX: 0,
    startY: 0,
    isDragging: false,
    isVertical: false,
    offset: 0,
    isOpen: false,
    moved: false
  });

  const applyOffset = useCallback(
    (offset) => {
      if (!rowRef.current || !bgRef.current) return;
      const pct = Math.min(1, Math.abs(offset) / threshold);
      rowRef.current.style.transform = `translateX(${offset}px)`;
      bgRef.current.style.opacity = String(pct);
    },
    [threshold]
  );

  const reset = useCallback(() => {
    if (!rowRef.current || !bgRef.current) return;
    rowRef.current.style.transition = 'transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94)';
    bgRef.current.style.transition = 'opacity 0.25s ease';
    rowRef.current.style.transform = 'translateX(0)';
    bgRef.current.style.opacity = '0';
    state.current.offset = 0;
    state.current.isOpen = false;
    state.current.moved = false;
    onReset?.();
  }, [onReset]);

  const finish = useCallback(
    (offset) => {
      if (!rowRef.current || !bgRef.current) return;
      rowRef.current.style.transition = 'transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94)';
      bgRef.current.style.transition = 'opacity 0.25s ease';

      if (Math.abs(offset) >= threshold) {
        rowRef.current.style.transform = `translateX(-${maxSwipe}px)`;
        bgRef.current.style.opacity = '1';
        state.current.isOpen = true;
        onReveal?.();
      } else {
        reset();
      }
    },
    [maxSwipe, onReveal, reset, threshold]
  );

  const onTouchStart = useCallback((event) => {
    if (isInteractiveTarget(event.target)) return;
    const touch = event.touches?.[0];
    if (!touch) return;
    const current = state.current;
    current.startX = touch.clientX;
    current.startY = touch.clientY;
    current.isDragging = true;
    current.isVertical = false;
    current.offset = 0;
    current.moved = false;
    if (rowRef.current) rowRef.current.style.transition = 'none';
    if (bgRef.current) bgRef.current.style.transition = 'none';
  }, []);

  const onTouchMove = useCallback(
    (event) => {
      const touch = event.touches?.[0];
      const current = state.current;
      if (!touch || !current.isDragging) return;

      const dx = touch.clientX - current.startX;
      const dy = touch.clientY - current.startY;

      if (current.offset === 0 && Math.abs(dy) > Math.abs(dx) + 5) {
        current.isVertical = true;
        return;
      }
      if (current.isVertical) return;
      if (dx > 0 && current.offset === 0) return;

      event.preventDefault();
      if (Math.abs(dx) > 4) current.moved = true;
      current.offset = Math.max(-maxSwipe, Math.min(0, dx));
      applyOffset(current.offset);
    },
    [applyOffset, maxSwipe]
  );

  const onTouchEnd = useCallback(() => {
    const current = state.current;
    if (!current.isDragging || current.isVertical) {
      current.isDragging = false;
      return;
    }
    current.isDragging = false;
    finish(current.offset);
  }, [finish]);

  const onMouseDown = useCallback(
    (event) => {
      if (event.button !== 0 || isInteractiveTarget(event.target)) return;
      const current = state.current;
      current.startX = event.clientX;
      current.isDragging = true;
      current.offset = 0;
      current.moved = false;
      if (rowRef.current) rowRef.current.style.transition = 'none';
      if (bgRef.current) bgRef.current.style.transition = 'none';

      const onMove = (moveEvent) => {
        if (!current.isDragging) return;
        const dx = moveEvent.clientX - current.startX;
        if (dx > 0 && current.offset === 0) return;
        if (Math.abs(dx) > 4) current.moved = true;
        current.offset = Math.max(-maxSwipe, Math.min(0, dx));
        applyOffset(current.offset);
      };

      const onUp = () => {
        if (!current.isDragging) return;
        current.isDragging = false;
        finish(current.offset);
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [applyOffset, finish, maxSwipe]
  );

  const onClickCapture = useCallback((event) => {
    const current = state.current;
    if (!current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    current.moved = false;
  }, []);

  return {
    rowRef,
    bgRef,
    reset,
    isOpen: () => state.current.isOpen,
    bind: { onTouchStart, onTouchMove, onTouchEnd, onMouseDown, onClickCapture }
  };
}
