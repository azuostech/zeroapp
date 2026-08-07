import { redirect } from 'next/navigation';
import { COMMUNITY_WHATSAPP_URL } from '@/src/lib/community/community-link';

export const metadata = {
  title: 'Comunidade | ZeroApp'
};

export default function TurmaPage() {
  redirect(COMMUNITY_WHATSAPP_URL);
}
