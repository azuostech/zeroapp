'use client';

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#1a1a1a',
          color: '#ffffff',
          border: '1px solid #2f2f2f',
          borderRadius: '12px',
          boxShadow: '0 14px 34px rgba(0,0,0,0.35)'
        },
        success: {
          iconTheme: {
            primary: '#00C853',
            secondary: '#07130c'
          }
        },
        error: {
          iconTheme: {
            primary: '#d74141',
            secondary: '#ffffff'
          }
        }
      }}
      containerStyle={{
        zIndex: 9999
      }}
    />
  );
}

