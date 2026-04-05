import { jsx as _jsx } from "react/jsx-runtime";
import { Select } from '../ui/Select';
export function MonthSelector({ value, onChange }) {
    const now = new Date();
    const options = Array.from({ length: 12 }).map((_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return month;
    });
    return (_jsx(Select, { value: value, onChange: (e) => onChange(e.target.value), children: options.map((month) => (_jsx("option", { value: month, children: month }, month))) }));
}
