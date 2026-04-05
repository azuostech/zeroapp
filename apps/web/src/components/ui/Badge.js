import { jsx as _jsx } from "react/jsx-runtime";
import styles from './ui.module.css';
export function Badge({ children }) {
    return _jsx("span", { className: styles.badge, children: children });
}
