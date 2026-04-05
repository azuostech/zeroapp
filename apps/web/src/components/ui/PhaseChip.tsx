import styles from './ui.module.css';

export function PhaseChip({ phase }: { phase: string }) {
  const map: Record<string, string> = {
    BOMBEIRO: styles.phaseBombeiro,
    SOBREVIVENTE: styles.phaseSobrevivente,
    CONSTRUTOR: styles.phaseConstrutor,
    MULTIPLICADOR: styles.phaseMultiplicador
  };

  return <span className={`${styles.phaseChip} ${map[phase] ?? styles.phaseBombeiro}`}>{phase}</span>;
}
