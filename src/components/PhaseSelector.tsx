import type { CompilerPhase } from '../compiler/types';

export interface PhaseSelectorProps {
  selected: CompilerPhase;
  onChange: (phase: CompilerPhase) => void;
}

const phases: { id: CompilerPhase; label: string }[] = [
  { id: 'lexical', label: 'Lexical' },
  { id: 'syntax', label: 'Syntax' },
  { id: 'semantic', label: 'Semantic' },
];

export function PhaseSelector({ selected, onChange }: PhaseSelectorProps) {
  return (
    <div className="phase-selector">
      {phases.map(({ id, label }) => (
        <button
          key={id}
          className={selected === id ? 'selected' : ''}
          onClick={() => onChange(id)}
          aria-pressed={selected === id}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
