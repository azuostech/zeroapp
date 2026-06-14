'use client';

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'var(--bg-card)',
          color: 'var(--text)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)'
        },
        success: {
          iconTheme: {
            primary: 'var(--green)',
            secondary: 'var(--text-on-green)'
          }
        },
        error: {
          iconTheme: {
            primary: 'var(--red)',
            secondary: 'var(--text-on-green)'
          }
        }
      }}
      containerStyle={{
        zIndex: 9999
      }}
    />
  );
}
