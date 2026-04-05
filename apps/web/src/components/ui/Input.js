import { jsx as _jsx } from "react/jsx-runtime";
import styles from './ui.module.css';
export function Input(props) {
    return _jsx("input", { className: styles.input, ...props });
}
