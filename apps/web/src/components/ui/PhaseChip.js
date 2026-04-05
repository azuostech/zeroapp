import { jsx as _jsx } from "react/jsx-runtime";
import styles from './ui.module.css';
export function PhaseChip({ phase }) {
    const map = {
        BOMBEIRO: styles.phaseBombeiro,
        SOBREVIVENTE: styles.phaseSobrevivente,
        CONSTRUTOR: styles.phaseConstrutor,
        MULTIPLICADOR: styles.phaseMultiplicador
    };
    return _jsx("span", { className: `${styles.phaseChip} ${map[phase] ?? styles.phaseBombeiro}`, children: phase });
}
