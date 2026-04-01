import React, { useState } from 'react';
import { useFileSystem } from './hooks/useFileSystem';
import { WorkspaceBoard } from './components/workspace/WorkspaceBoard';
import { Sidebar } from './components/layout/Sidebar';
import { NewProjectWizard } from './components/wizard/NewProjectWizard';
import { ParticlesBackground } from './components/layout/ParticlesBackground';

function App() {
  const { isGranted, rootHandle, requestAccess, error } = useFileSystem();
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const handleConnect = async () => {
    const handle = await requestAccess();
    if (handle) {
      console.log('Access granted to:', handle.name);
    }
  };

  const reloadSidebar = () => {
    window.dispatchEvent(new Event('vyasa-reload-sidebar'));
  };

  return (
    <div className="relative min-h-screen h-screen overflow-hidden flex flex-col">
      <ParticlesBackground />

      {isWizardOpen && (
        <NewProjectWizard 
          onClose={() => setIsWizardOpen(false)} 
          onSuccess={() => reloadSidebar()} 
        />
      )}

      {/* HEADER FIXO - Como solicitado, sempre exposto no topo */}
      <header className="relative z-20 py-3 px-6 border-b border-saffron-500/20 flex items-center justify-between shrink-0 bg-vyasa-900/40 backdrop-blur-md shadow-md">
        <div className="flex items-center gap-4">
          <img src="/logo-vyasa.png" alt="Vyasa Sync Logo" className="w-[42px] h-[42px] rounded-full shadow-[0_0_15px_rgba(244,180,26,0.2)] object-cover" />
          <div>
            <h1 className="text-xl font-bold tracking-widest text-saffron-400 uppercase drop-shadow-md">
              Vyasa Sync
            </h1>
          </div>
        </div>
        {isGranted && rootHandle && (
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsWizardOpen(true)}
              className="bg-vyasa-800 border-b border-saffron-500 text-saffron-500 hover:bg-saffron-500/20 px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all"
            >
              + Novo Projeto
            </button>
            <div className="flex items-center gap-3 bg-vyasa-900/50 px-4 py-1.5 rounded-full border border-saffron-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
              <span className="text-xs font-sans text-vyasa-100 opacity-90 uppercase tracking-widest">
                Templo: {rootHandle.name}
              </span>
            </div>
          </div>
        )}
      </header>

      {/* MAIN CONTENT - Espaço total para colunas */}
      <main className="relative z-10 flex-grow flex overflow-hidden h-full">
        {isGranted && rootHandle && <Sidebar />}
        {!isGranted ? (
          <div className="flex-grow flex items-center justify-center">
            <div className="glass-panel-vedic p-10 max-w-lg w-full flex flex-col justify-center items-center text-center transition-transform hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(244,180,26,0.2)] duration-300 group">
              
              <div className="absolute inset-0 bg-gradient-to-t from-saffron-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

              <div className="relative z-10 w-20 h-20 rounded-full border border-saffron-400 bg-vyasa-900/50 flex justify-center items-center mb-8 shadow-[0_0_20px_rgba(246,196,70,0.4)] group-hover:scale-110 transition-transform duration-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-saffron-400"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 20v-2a2 2 0 0 0-2-2v-4a2 2 0 0 0-2-2H4"/></svg>
              </div>
              
              <h2 className="relative z-10 text-3xl font-serif text-white mb-3 tracking-wide">Diretório Principal</h2>
              <p className="relative z-10 text-sm text-vyasa-100 opacity-80 mb-10 leading-relaxed font-light px-4">
                Por favor, autorize o Vyasa Sync a acessar a pasta raiz onde seus projetos respiram.
              </p>
              
              {error && <p className="text-red-400 text-sm mb-4 relative z-10 px-4">{error}</p>}

              <button 
                onClick={handleConnect}
                className="relative z-10 bg-gradient-to-r from-saffron-600 to-saffron-500 text-vyasa-900 font-bold py-3.5 px-8 rounded opacity-90 hover:opacity-100 transition-all glow-saffron cursor-pointer tracking-widest text-sm uppercase">
                Conectar Workspace
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-grow flex w-full h-full rounded-md p-2 items-center justify-center relative shadow-inner">
            <WorkspaceBoard />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
