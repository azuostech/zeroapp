import styles from './portal.module.css';

export default function PortalTopBar() {
  return (
    <div className={styles.topBar}>
      <p>
        Portal educacional · conteúdo gratuito baseado no método{' '}
        <span>Lucro Primeiro</span>
      </p>
    </div>
  );
}
