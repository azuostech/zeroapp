'use client';
import { useState } from 'react';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import BottomNav from '@/components/layout/BottomNav';
import FAB from '@/components/layout/FAB';
import JacksonAIModal from '@/components/layout/JacksonAIModal';
import MentorSessionBanner from '@/src/modules/patrimony/presentation/MentorSessionBanner';
import styles from './investments.module.css';

export function buildInvestmentsHref(path = '', userId = null) {
  return userId ? `/admin/users/${encodeURIComponent(userId)}/investimentos${path}` : `/financas/investimentos${path}`;
}

export default function InvestmentsShell({ title, subtitle, adminViewUserId, backHref, backLabel = 'voltar', children }) {
  const [aiOpen, setAiOpen] = useState(false);
  const fallbackBack = title === 'Investimentos' ? (adminViewUserId ? `/admin/users/${encodeURIComponent(adminViewUserId)}/dashboard` : '/app') : buildInvestmentsHref('', adminViewUserId);
  return <div className={`${styles.shell} ${adminViewUserId ? styles.adminShell : ''}`}>
    {adminViewUserId ? <MentorSessionBanner userId={adminViewUserId} /> : <AppHeader />}
    <header className={styles.head}>
      <Link className={styles.back} href={backHref || fallbackBack}>← {backLabel}</Link>
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </header>
    <main className={styles.main}>{children}</main>
    {!adminViewUserId ? <><BottomNav activeTab="financas" /><FAB onClick={() => setAiOpen(true)} /><JacksonAIModal isOpen={aiOpen} onClose={() => setAiOpen(false)} /></> : null}
  </div>;
}
