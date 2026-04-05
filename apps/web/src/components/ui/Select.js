import { jsx as _jsx } from "react/jsx-runtime";
import styles from './ui.module.css';
export function Select(props) {
    return _jsx("select", { className: styles.select, ...props });
}
