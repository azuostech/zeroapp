'use client';

import Link from 'next/link';

export default function NavigationCard({ icon, label, onClick, href }) {
  const handleClick = (event) => {
    if (onClick) onClick(event);
  };

  if (href) {
    return (
      <Link href={href} className="hub-nav-card" onClick={handleClick}>
        <span className="hub-nav-card-media">
          <span className="hub-nav-card-icon" aria-hidden="true">{icon}</span>
        </span>
        <span className="hub-nav-card-label">{label}</span>
      </Link>
    );
  }

  return (
    <button type="button" className="hub-nav-card" onClick={handleClick}>
      <span className="hub-nav-card-media">
        <span className="hub-nav-card-icon" aria-hidden="true">{icon}</span>
      </span>
      <span className="hub-nav-card-label">{label}</span>
    </button>
  );
}
