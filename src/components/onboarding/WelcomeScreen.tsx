import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { ParticlesBackground } from '../layout/ParticlesBackground';

interface WelcomeScreenProps {
  onConnect: () => Promise<any>;
  connectError: string | null;
  onNewProject: () => void; // abre o wizard após conectar
}

export function WelcomeScreen({ onConnect, connectError, onNewProject }: WelcomeScreenProps) {
  const { user, profile, signOut } = useAuthStore();
  const [connecting, setConnecting] = useState(false);

  const displayName = profile?.full_name
    || user?.user_metadata?.full_name
    || user?.email?.split('@')[0]
    || 'Arquiteto';

  const isPro = profile?.plan === 'pro';

  const handleOpenCockpit = async () => {
    setConnecting(true);
    await onConnect();
    setConnecting(false);
  };

  const handleNewProject = async () => {
    setConnecting(true);
    const handle = await onConnect();
    setConnecting(false);
    if (handle) onNewProject();
  };

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-vyasa-900">
      <ParticlesBackground />

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-saffron-500/4 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-20 py-4 px-8 border-b border-saffron-500/15 flex items-center justify-between bg-vyasa-900/60 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <img src="/logo-vyasa.png" alt="Vyasa Sync" className="w-9 h-9 rounded-full object-cover shadow-[0_0_12px_rgba(244,180,26,0.2)]" />
          <span className="text-lg font-bold tracking-widest text-saffron-400 uppercase">Vyasa Sync</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-saffron-500/20 border border-saffron-500/40 flex items-center justify-center text-saffron-400 text-xs font-bold">
              {displayName[0].toUpperCase()}
            </div>
            <span className="text-sm text-vyasa-100/70">{displayName}</span>
            {isPro && <span className="text-[9px] bg-saffron-500 text-vyasa-900 font-black px-1.5 py-0.5 rounded tracking-widest uppercase">PRO</span>}
          </div>
          <button onClick={signOut} className="text-xs text-vyasa-100/30 hover:text-vyasa-100/60 transition-colors">Sair</button>
        </div>
      </header>

      {/* DASHBOARD */}
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center px-6 py-12">

        {/* Saudação */}
        <div className="text-center mb-12">
          <p className="text-saffron-400/50 text-xs tracking-[0.5em] uppercase mb-3">Cockpit de Arquitetura</p>
          <h2 className="text-5xl font-serif text-white mb-3">
            Olá, <span className="text-saffron-400">{displayName.split(' ')[0]}</span>.
          </h2>
          <p className="text-vyasa-100/40 text-sm">O que vamos construir hoje?</p>
        </div>

        {/* CTAs PRINCIPAIS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-xl mb-6">

          {/* Ir ao Cockpit */}
          <button
            onClick={handleOpenCockpit}
            disabled={connecting}
            className="group flex flex-col items-start gap-3 p-6 rounded-xl bg-saffron-500/10 border border-saffron-500/30 hover:border-saffron-500/60 hover:bg-saffron-500/15 transition-all duration-200 text-left disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-lg bg-saffron-500/20 border border-saffron-500/30 flex items-center justify-center text-saffron-400 group-hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
            </div>
            <div>
              <p className="text-white font-bold tracking-wide text-sm">
                {connecting ? 'Conectando...' : 'Abrir Cockpit'}
              </p>
              <p className="text-vyasa-100/40 text-xs mt-0.5">Ver projetos em andamento</p>
            </div>
          </button>

          {/* Novo Projeto */}
          <button
            onClick={handleNewProject}
            disabled={connecting}
            className="group flex flex-col items-start gap-3 p-6 rounded-xl bg-vyasa-800/40 border border-saffron-500/15 hover:border-saffron-500/40 hover:bg-vyasa-800/60 transition-all duration-200 text-left disabled:opacity-50"
          >
            <div className="w-10 h-10 rounded-lg bg-vyasa-700/60 border border-saffron-500/20 flex items-center justify-center text-saffron-400/70 group-hover:text-saffron-400 group-hover:scale-110 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            </div>
            <div>
              <p className="text-white font-bold tracking-wide text-sm">Novo Projeto</p>
              <p className="text-vyasa-100/40 text-xs mt-0.5">Criar estrutura e definir vocação</p>
            </div>
          </button>
        </div>

        {connectError && (
          <p className="text-red-400 text-xs mb-4 max-w-sm text-center">{connectError}</p>
        )}

        {/* Link terciário */}
        <p className="text-[11px] text-vyasa-100/20 mt-2">
          Ao abrir o cockpit, você autoriza o acesso à pasta de projetos no seu disco.
        </p>

      </main>
    </div>
  );
}
