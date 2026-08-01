'use client';

import BottomNav from '@/components/layout/BottomNav';

export default function BottomNavHub({ initialProfile = null }) {
  return <BottomNav activeTab="inicio" initialProfile={initialProfile} />;
}
