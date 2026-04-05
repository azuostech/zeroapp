import { BadgeDisplay } from '../../components/app/BadgeDisplay';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApiQuery';

export function PerfilPage() {
  const { user } = useAuth();
  const badges = useApiQuery<Array<{ badge: { icon: string; name: string } }>>('badges', '/badges');

  return (
    <div>
      <h1 className="sectionTitle">👤 Perfil</h1>
      <p className="sectionDesc">Dados da conta, código de indicação e conquistas.</p>
      <Card>
        <Avatar name={user?.name ?? 'U'} avatar={user?.avatar} />
        <h3>{user?.name}</h3>
        <p>{user?.email}</p>
        <p>Código de indicação: {user?.referralCode}</p>
      </Card>
      <h3 className="section">Badges</h3>
      <BadgeDisplay items={badges.data ?? []} />
    </div>
  );
}
