import { jsx as _jsx } from "react/jsx-runtime";
import styles from './ui.module.css';
export function Card({ children }) {
    return _jsx("div", { className: styles.card, children: children });
}
