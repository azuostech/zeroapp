import { Select } from '../ui/Select';

export function MonthSelector({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const now = new Date();
  const options = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return month;
  });

  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((month) => (
        <option key={month} value={month}>{month}</option>
      ))}
    </Select>
  );
}
