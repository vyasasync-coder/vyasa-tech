import { useState, useEffect } from 'react';
import { useFileSystem } from './hooks/useFileSystem';
import { useAuthStore } from './store/authStore';
import { useWorkspaceStore } from './store/workspaceStore';
import { WorkspaceBoard } from './components/workspace/WorkspaceBoard';
import { Sidebar } from './components/layout/Sidebar';
import { NewProjectWizard } from './components/wizard/NewProjectWizard';
import { ParticlesBackground } from './components/layout/ParticlesBackground';
import { AuthPage } from './components/auth/AuthPage';
import { WelcomeScreen } from './components/onboarding/WelcomeScreen';
import { SettingsModal } from './components/settings/SettingsModal';
import { GlobalKnowledgeBank } from './components/knowledge/GlobalKnowledgeBank';

function App() {
  const { isGranted, rootHandle, requestAccess, isRestoring, error: fsError } = useFileSystem();
  const { session, isLoading, initAuth, profile, signOut } = useAuthStore();
  const { showGlobalKB } = useWorkspaceStore();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Inicializa listener de auth do Supabase ao montar
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    initAuth().then((unsub) => { unsubscribe = unsub; });
    return () => { unsubscribe?.(); };
  }, [initAuth]);

  const handleConnect = async () => {
    const handle = await requestAccess();
    if (handle) {
      console.log('[Vyasa] Workspace conectado:', handle.name);
    }
  };

  const reloadSidebar = () => {
    window.dispatchEvent(new Event('vyasa-reload-sidebar'));
  };

  // ── Estado 0: Carregando sessão ou restaurando workspace ──
  if (isLoading || isRestoring) {
    return (
      <div className="min-h-screen bg-vyasa-900 flex items-center justify-center">
        <ParticlesBackground />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <img src="/logo-vyasa.png" alt="Vyasa Sync" className="w-14 h-14 rounded-full object-cover shadow-[0_0_25px_rgba(244,180,26,0.3)] animate-pulse" />
          <p className="text-saffron-400/60 text-xs tracking-[0.4em] uppercase">Inicializando...</p>
        </div>
      </div>
    );
  }

  // ── Estado 1: Não autenticado → Landing + Login/Register ──
  if (!session) {
    return <AuthPage />;
  }

  // ── Estado 2: Autenticado, mas sem Workspace conectado → Dashboard ──
  if (!isGranted || !rootHandle) {
    return (
      <WelcomeScreen
        onConnect={requestAccess}
        connectError={fsError}
        onNewProject={() => setIsWizardOpen(true)}
      />
    );
  }

  // ── Estado 3: Autenticado + Workspace conectado → Cockpit completo ──
  const displayName =
    profile?.full_name ||
    session.user?.user_metadata?.full_name ||
    session.user?.email?.split('@')[0] ||
    'Arquiteto';

  return (
    <div className="relative min-h-screen h-screen overflow-hidden flex flex-col">
      <ParticlesBackground />

      {isWizardOpen && (
        <NewProjectWizard
          onClose={() => setIsWizardOpen(false)}
          onSuccess={() => reloadSidebar()}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal onClose={() => setIsSettingsOpen(false)} />
      )}

      {/* HEADER */}
      <header className="relative z-20 py-3 px-6 border-b border-saffron-500/20 flex items-center justify-between shrink-0 bg-vyasa-900/40 backdrop-blur-md shadow-md">
        <div className="flex items-center gap-4">
          <img
            src="/logo-vyasa.png"
            alt="Vyasa Sync Logo"
            className="w-[42px] h-[42px] rounded-full shadow-[0_0_15px_rgba(244,180,26,0.2)] object-cover"
          />
          <div>
            <h1 className="text-xl font-bold tracking-widest text-saffron-400 uppercase drop-shadow-md">
              Vyasa Sync
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Novo Projeto */}
          <button
            onClick={() => setIsWizardOpen(true)}
            className="bg-vyasa-800 border-b border-saffron-500 text-saffron-500 hover:bg-saffron-500/20 px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all"
          >
            + Novo Projeto
          </button>

          {/* Workspace badge — clicável para trocar */}
          <button
            onClick={handleConnect}
            className="flex items-center gap-3 bg-vyasa-900/50 px-4 py-1.5 rounded-full border border-saffron-500/20 hover:border-saffron-500/50 hover:bg-vyasa-800/60 transition-all group"
            title="Clique para trocar o workspace"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            <span className="text-xs font-sans text-vyasa-100 opacity-90 uppercase tracking-widest">
              Templo: {rootHandle.name}
            </span>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-saffron-500/40 group-hover:text-saffron-400 transition-colors"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>

          {/* Usuário + Settings */}
          <div className="flex items-center gap-2 pl-2 border-l border-saffron-500/15">
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="text-vyasa-100/40 hover:text-saffron-400 transition-colors p-1.5 rounded hover:bg-saffron-500/10"
              title="Configurações"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
            </button>
            <div
              className="w-7 h-7 rounded-full bg-saffron-500/20 border border-saffron-500/40 flex items-center justify-center text-saffron-400 text-xs font-bold cursor-pointer hover:bg-saffron-500/30 transition-colors"
              title={displayName}
              onClick={() => setIsSettingsOpen(true)}
            >
              {displayName[0].toUpperCase()}
            </div>
            <button
              onClick={signOut}
              className="text-[10px] text-vyasa-100/25 hover:text-vyasa-100/50 transition-colors tracking-widest uppercase"
              title="Sair"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="relative z-10 flex-grow flex overflow-hidden h-full">
        <Sidebar />
        <div className="flex-grow flex w-full h-full rounded-md p-2 items-center justify-center relative shadow-inner">
          {showGlobalKB ? <GlobalKnowledgeBank /> : <WorkspaceBoard />}
        </div>
      </main>
    </div>
  );
}

export default App;
