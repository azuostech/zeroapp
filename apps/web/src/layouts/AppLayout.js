import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Outlet } from 'react-router-dom';
import { AppHeader } from '../components/ui/AppHeader';
import { TabsBar } from '../components/ui/TabsBar';
import '../styles/app.css';
export function AppLayout() {
    return (_jsxs("div", { className: "appShell", children: [_jsx(AppHeader, {}), _jsx(TabsBar, {}), _jsx("main", { className: "content", children: _jsx(Outlet, {}) })] }));
}
