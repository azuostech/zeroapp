import { jsx as _jsx } from "react/jsx-runtime";
import styles from './ui.module.css';
export function Button({ variant = 'secondary', className = '', ...props }) {
    return _jsx("button", { className: `${styles.button} ${styles[variant]} ${className}`.trim(), ...props });
}
