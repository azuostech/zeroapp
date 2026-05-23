import ContentAdminForm from '@/components/admin/ContentAdminForm';

export default async function AdminEditarConteudoPage({ params }) {
  const resolved = await params;
  return <ContentAdminForm mode="edit" contentId={resolved?.id || null} />;
}
