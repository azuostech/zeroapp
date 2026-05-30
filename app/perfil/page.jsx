'use client';

import { useState } from 'react';
import FAB from '@/components/layout/FAB';
import JacksonAIModal from '@/components/layout/JacksonAIModal';
import FinanceAppPage from '@/src/modules/finance/presentation/finance-app-page';

export default function PerfilPage() {
  const [isIAOpen, setIsIAOpen] = useState(false);

  return (
    <>
      <FinanceAppPage activeTab="voce" focusSectionId="perfil" />
      <FAB onClick={() => setIsIAOpen(true)} />
      <JacksonAIModal isOpen={isIAOpen} onClose={() => setIsIAOpen(false)} />
    </>
  );
}
