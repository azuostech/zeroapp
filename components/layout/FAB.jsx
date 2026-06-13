'use client';

export default function FAB({ onClick }) {
  return (
    <>
      <button type="button" onClick={onClick} className="fab" aria-label="Abrir Jackson IA">
        🤖
      </button>
      <style>{styles}</style>
    </>
  );
}

const styles = `
  .fab {
    position: fixed;
    bottom: calc(var(--bottom-nav-height) + 16px);
    right: 20px;
    width: var(--fab-size);
    height: var(--fab-size);
    border-radius: 50%;
    border: none;
    background: var(--green);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    box-shadow: var(--shadow-green);
    cursor: pointer;
    z-index: 90;
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
  }

  .fab:active {
    transform: scale(0.95);
    box-shadow: var(--shadow-green);
  }

  .fab:focus-visible {
    outline: 2px solid var(--text-on-green);
    outline-offset: 2px;
  }
`;
