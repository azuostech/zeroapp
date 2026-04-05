import { jsx as _jsx } from "react/jsx-runtime";
import { NavLink } from 'react-router-dom';
import styles from './ui.module.css';
export function Tabs({ items }) {
    return (_jsx("div", { className: styles.tabs, children: items.map((item) => (_jsx(NavLink, { to: item.to, children: item.label }, item.to))) }));
}
