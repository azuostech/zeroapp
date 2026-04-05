import { Card } from '../ui/Card';

export function BadgeDisplay({ items }: { items: Array<{ badge: { icon: string; name: string } }> }) {
  return (
    <div className="card-grid">
      {items.map((b, i) => (
        <Card key={i}>
          <h4>{b.badge.icon} {b.badge.name}</h4>
        </Card>
      ))}
    </div>
  );
}
