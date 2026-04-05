import type { PropsWithChildren } from 'react';

export function Modal({ children }: PropsWithChildren) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'grid', placeItems: 'center' }}>
      <div style={{ width: 'min(560px, 92vw)', background: '#222', border: '1px solid #333', borderRadius: 12, padding: 16 }}>{children}</div>
    </div>
  );
}
