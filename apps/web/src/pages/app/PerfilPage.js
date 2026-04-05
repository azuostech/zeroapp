import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BadgeDisplay } from '../../components/app/BadgeDisplay';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { useApiQuery } from '../../hooks/useApiQuery';
export function PerfilPage() {
    const { user } = useAuth();
    const badges = useApiQuery('badges', '/badges');
    return (_jsxs("div", { children: [_jsx("h1", { className: "sectionTitle", children: "\uD83D\uDC64 Perfil" }), _jsx("p", { className: "sectionDesc", children: "Dados da conta, c\u00F3digo de indica\u00E7\u00E3o e conquistas." }), _jsxs(Card, { children: [_jsx(Avatar, { name: user?.name ?? 'U', avatar: user?.avatar }), _jsx("h3", { children: user?.name }), _jsx("p", { children: user?.email }), _jsxs("p", { children: ["C\u00F3digo de indica\u00E7\u00E3o: ", user?.referralCode] })] }), _jsx("h3", { className: "section", children: "Badges" }), _jsx(BadgeDisplay, { items: badges.data ?? [] })] }));
}
