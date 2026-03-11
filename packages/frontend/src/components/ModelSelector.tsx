import { ChevronDown } from 'lucide-react';

const MODELS = [
  { id: 'claude-haiku-4-5-20251001', name: 'Haiku 4.5', desc: 'Fast & affordable', icon: '⚡' },
  { id: 'claude-sonnet-4-20250514', name: 'Sonnet 4', desc: 'Balanced', icon: '⚖️' },
  { id: 'claude-opus-4-20250514', name: 'Opus 4', desc: 'Most capable', icon: '🧠' },
];

interface Props {
  value: string;
  onChange: (model: string) => void;
  disabled?: boolean;
}

export default function ModelSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="appearance-none pl-3 pr-8 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm font-medium focus:ring-2 focus:ring-blue-500 disabled:opacity-50 cursor-pointer"
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.icon} {m.name} - {m.desc}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
    </div>
  );
}
