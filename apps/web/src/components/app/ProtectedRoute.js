import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
export function ProtectedRoute({ adminOnly = false }) {
    const { user } = useAuth();
    if (!user)
        return _jsx(Navigate, { to: "/login", replace: true });
    if (adminOnly && user.role !== 'ADMIN')
        return _jsx(Navigate, { to: "/app/dashboard", replace: true });
    return _jsx(Outlet, {});
}
