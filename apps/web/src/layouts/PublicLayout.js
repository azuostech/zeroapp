import { jsx as _jsx } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
export function PublicLayout() {
    return (_jsx("div", { className: "layout-shell", children: _jsx(Outlet, {}) }));
}
