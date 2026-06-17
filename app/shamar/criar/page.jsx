'use client';

import { useEffect, useState } from 'react';
import {
  ShamarHeader,
  ShamarLoading,
  ShamarLockedState,
  ShamarSetupError,
  ShamarShell
} from '@/components/shamar/ShamarUI';
import { ShamarModeCreator } from '@/components/shamar/ShamarModeCreator';
import { useShamar } from '@/hooks/useShamar';

const ALLOWED_MODES = new Set(['individual', 'dupla', 'tribo']);

export default function ShamarCreatePage() {
  const [initialMode, setInitialMode] = useState('individual');
  const { seasons, locked, unlockProgress, error, isLoading, refresh } = useShamar();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedMode = params.get('mode');
    if (ALLOWED_MODES.has(requestedMode)) setInitialMode(requestedMode);
  }, []);

  if (isLoading) return <ShamarLoading />;
  if (locked) return <ShamarLockedState unlockProgress={unlockProgress} />;
  if (error) return <ShamarSetupError error={error} />;

  return (
    <ShamarShell activeTab="shamar">
      <ShamarHeader
        hrefBack="/shamar"
        label="Nova jornada"
        title="Criar SHAMAR"
        subtitle="Escolha Individual, Dupla ou Tribo. Cada pessoa acompanha os próprios quadrinhos."
        stats={[
          { label: 'Individual', value: '1' },
          { label: 'Dupla', value: '2' },
          { label: 'Tribo', value: '3+' }
        ]}
      />
      <ShamarModeCreator seasons={seasons} initialMode={initialMode} onCreated={refresh} />
    </ShamarShell>
  );
}
