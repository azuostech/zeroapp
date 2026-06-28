'use client';

import Link from 'next/link';

export default function NavigationCard({ icon, label, onClick, href, locked = false }) {
  const handleClick = (event) => {
    if (locked) {
      event.preventDefault();
      return;
    }
    if (onClick) onClick(event);
  };

  const content = (
    <>
      {locked ? <span className="hub-nav-card-lock" aria-hidden="true">🔒</span> : null}
      <span className="hub-nav-card-media">
        <span className="hub-nav-card-icon" aria-hidden="true">{icon}</span>
      </span>
      <span className="hub-nav-card-label">{label}</span>
    </>
  );

  if (href && !locked) {
    return (
      <Link href={href} className="hub-nav-card" onClick={handleClick}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={`hub-nav-card${locked ? ' locked' : ''}`}
      onClick={handleClick}
      aria-disabled={locked}
      title={locked ? 'Acesso exclusivo para alunos' : undefined}
    >
      {content}
    </button>
  );
}
