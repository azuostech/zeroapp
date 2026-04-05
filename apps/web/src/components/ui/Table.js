import { jsx as _jsx } from "react/jsx-runtime";
import styles from './ui.module.css';
export function Table({ children }) {
    return (_jsx("div", { className: styles.tableWrap, children: _jsx("table", { className: styles.table, children: children }) }));
}
