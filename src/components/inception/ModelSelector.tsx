import { useState, useRef, useEffect } from 'react';
import { getAvailableModels, type ModelOption, type AIProvider } from '../../lib/ai';

interface ModelSelectorProps {
  value: ModelOption | null;
  onChange: (model: ModelOption) => void;
}

const PROVIDER_LABELS: Record<AIProvider, string> = {
  groq: 'Groq',
  openrouter: 'OpenRouter',
};

const PROVIDER_ORDER: AIProvider[] = ['groq', 'openrouter'];

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const models = getAvailableModels();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Agrupa por provider
  const grouped = PROVIDER_ORDER
    .map((p) => ({
      provider: p,
      label: PROVIDER_LABELS[p],
      models: models.filter((m) => m.provider === p),
    }))
    .filter((g) => g.models.length > 0);

  if (models.length === 0) {
    return (
      <div className="text-[11px] text-red-400/70 px-3 py-1.5 border border-red-500/20 rounded-lg bg-red-500/5">
        Nenhum modelo disponivel — configure API keys
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-saffron-500/20 hover:border-saffron-500/40 bg-vyasa-800/40 hover:bg-vyasa-800/60 transition-all text-left"
      >
        <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
        <span className="text-[11px] text-white font-medium truncate max-w-[180px]">
          {value?.label || 'Selecionar modelo'}
        </span>
        {value?.free && (
          <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
            free
          </span>
        )}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-vyasa-100/40 transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-72 max-h-80 overflow-y-auto rounded-xl border border-saffron-500/20 bg-vyasa-900/95 backdrop-blur-xl shadow-2xl z-50">
          {grouped.map((group) => (
            <div key={group.provider}>
              <div className="sticky top-0 px-3 py-2 bg-vyasa-900/90 border-b border-saffron-500/10">
                <span className="text-[10px] text-saffron-400/60 font-bold tracking-[0.2em] uppercase">
                  {group.label}
                </span>
              </div>
              {group.models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onChange(m);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-saffron-500/10 transition-colors ${
                    value?.id === m.id ? 'bg-saffron-500/15' : ''
                  }`}
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      value?.id === m.id ? 'bg-saffron-400' : 'bg-vyasa-100/20'
                    }`}
                  />
                  <span className="text-[12px] text-white truncate flex-1">{m.label}</span>
                  {m.free && (
                    <span className="text-[9px] bg-emerald-500/15 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">
                      free
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
