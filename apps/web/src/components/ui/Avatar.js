import { jsx as _jsx } from "react/jsx-runtime";
import styles from './ui.module.css';
export function Avatar({ name, avatar }) {
    if (avatar) {
        return _jsx("img", { src: avatar, alt: name, className: styles.avatar });
    }
    return _jsx("div", { className: styles.avatar, children: name.slice(0, 1).toUpperCase() });
}
