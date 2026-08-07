'use client';

import {
  ShamarHeader,
  ShamarLoading,
  ShamarLockedState,
  ShamarSetupError,
  ShamarShell
} from '@/components/shamar/ShamarUI';
import { ShamarModeCreator } from '@/components/shamar/ShamarModeCreator';
import { useShamar } from '@/hooks/useShamar';

export default function ShamarCreatePage() {
  const { seasons, locked, unlockProgress, error, isLoading, refresh } = useShamar();

  if (isLoading) return <ShamarLoading />;
  if (locked) return <ShamarLockedState unlockProgress={unlockProgress} />;
  if (error) return <ShamarSetupError error={error} />;

  return (
    <ShamarShell activeTab="shamar">
      <ShamarHeader
        hrefBack="/shamar"
        label="Nova jornada"
        title="Criar SHAMAR"
        subtitle="Escolha uma meta que traga mais segurança para suas decisões."
        stats={[
          { label: 'Foco', value: 'Poupar' },
          { label: 'Ritmo', value: 'Seu' },
          { label: 'Próximo passo', value: 'Meta' }
        ]}
      />
      <ShamarModeCreator seasons={seasons} onCreated={refresh} />
    </ShamarShell>
  );
}
