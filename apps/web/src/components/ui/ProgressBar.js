import { jsx as _jsx } from "react/jsx-runtime";
import styles from './ui.module.css';
export function ProgressBar({ value }) {
    const safe = Math.max(0, Math.min(100, value));
    return (_jsx("div", { className: styles.progress, children: _jsx("span", { style: { width: `${safe}%` } }) }));
}
