import React, { useEffect } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { ProjectColumn } from './ProjectColumn';

export const WorkspaceBoard: React.FC = () => {
  const { projects, activeProjectIndex, nextProject, prevProject, addProject } = useWorkspaceStore();

  // Função simulada apenas para você ver o design antes da leitura real dos relatórios
  const mockProjeto = () => {
    const id = Math.random().toString(36).substring(7);
    addProject({ id, name: `Orquestração ${projects.length + 1}` });
  };

  // Lógica do Atalho (Ctrl + A)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl + A (Case insensitive)
      if (e.ctrlKey && e.key.toLowerCase() === 'a') {
        e.preventDefault(); // Evita o selecionar tudo do navegador
        nextProject();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextProject]);

  if (projects.length === 0) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center p-10 h-full">
        <div className="glass-panel-vedic p-12 max-w-xl text-center rounded-2xl flex flex-col items-center shadow-[0_0_30px_rgba(244,180,26,0.1)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-saffron-500/50 mb-6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          <h2 className="text-saffron-400 text-3xl font-sans tracking-widest mb-4 drop-shadow-md font-bold uppercase">
            Workspace Vazio
          </h2>
          <p className="text-vyasa-100 opacity-80 mb-10 leading-relaxed font-light">
            O seu workspace está sincronizado. Você não tem nenhum painel ativo no momento. Adicione Projetos ao cockpit para visualizá-los lado a lado.
          </p>
          <button 
            onClick={mockProjeto}
            className="bg-vyasa-900 border border-saffron-500/40 text-saffron-400 font-bold py-3 px-8 rounded opacity-90 hover:opacity-100 hover:bg-vyasa-800 transition-all glow-saffron tracking-widest text-sm uppercase flex items-center gap-3">
            <span className="text-lg leading-none">+</span> SIMULAR PROJETO
          </button>
        </div>
      </div>
    );
  }

  // Lógica do Carrossel (Max 4 exibidos)
  const isCarousel = projects.length > 4;

  const visibleProjects = isCarousel 
    ? projects.slice(activeProjectIndex, activeProjectIndex + 4) 
    : projects;

  // Se o slice cortar o fim e faltar elementos para dar 4 no carrossel, a lógica do Zustand já impede passar do Math.min
  // O layout flex-1 no pai e h-full nos filhos garante que a tela vertical será coberta

  return (
    <div className="flex-grow flex flex-col w-full h-full pb-2 relative">
      {/* Dev Debug Button temporário */}
      <div className="absolute top-1 right-2 z-50">
        <button onClick={mockProjeto} className="text-[10px] bg-vyasa-900/80 border border-saffron-500/50 text-saffron-400 px-3 py-1.5 rounded uppercase tracking-wider hover:bg-vyasa-800 backdrop-blur-md">
          + Injetar Dev Data
        </button>
      </div>

      {isCarousel && (
        <div className="flex justify-between items-center mb-3 px-6 pb-2 border-b border-saffron-500/20 shrink-0">
          <div className="flex gap-4">
            <button 
              onClick={prevProject} 
              disabled={activeProjectIndex === 0} 
              className="text-saffron-400 disabled:opacity-30 hover:text-white transition-colors"
            >
              ◀ Rebobinar
            </button>
            <button 
              onClick={nextProject} 
              disabled={activeProjectIndex >= projects.length - 4} 
              className="text-saffron-400 disabled:opacity-30 hover:text-white transition-colors"
            >
              Avançar ▶
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-vyasa-100 uppercase tracking-widest opacity-60">
              Rotacionar Painéis:
            </span>
            <kbd className="bg-vyasa-900/60 border border-saffron-500/30 px-2 py-1 rounded text-saffron-500 text-xs font-sans tracking-widest shadow-inner">
              CTRL + A
            </kbd>
          </div>
        </div>
      )}

      {/* Container Principal de Ocupação Máxima */}
      <div className={`grid flex-grow h-full w-full outline-none overflow-hidden ${
        visibleProjects.length === 1 ? 'grid-cols-1 md:max-w-2xl mx-auto' :
        visibleProjects.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
        visibleProjects.length === 3 ? 'grid-cols-1 md:grid-cols-3' :
        'grid-cols-1 md:grid-cols-4'
      } gap-4`}>
        {visibleProjects.map(project => (
          <div key={project.id} className="h-full max-h-[calc(100vh-120px)] overflow-hidden">
            <ProjectColumn project={project} />
          </div>
        ))}
      </div>
    </div>
  );
};
