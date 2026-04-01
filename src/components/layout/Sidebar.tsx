import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';

export const Sidebar: React.FC = () => {
  const { rootHandle, addProject, projects } = useWorkspaceStore();
  const [directories, setDirectories] = useState<any[]>([]);

  // Exportando a função loadDirectories caso o Wizard exija render de fora. 
  // O modo mais fácil é expor uma trigger de refresh vinda da Store ou props, 
  // mas para simplificar em nível de parent node, usaremos um listener simples ou apenas re-rodar useEffect via um State de trigger.

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Também precisamos expor isso para o App.tsx (ou fazer via Store se for global).
  // Para agora, adicionamos um evento Javascript customizado.
  useEffect(() => {
    const handleReload = () => setRefreshTrigger(t => t + 1);
    window.addEventListener('vyasa-reload-sidebar', handleReload);
    return () => window.removeEventListener('vyasa-reload-sidebar', handleReload);
  }, []);

  useEffect(() => {
    async function loadDirectories() {
      if (!rootHandle) return;
      const dirs: any[] = [];
      try {
        for await (const entry of (rootHandle as any).values()) {
          if (entry.kind === 'directory' && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            dirs.push(entry);
          }
        }
        setDirectories(dirs.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err) {
        console.error("Failed to read root directory", err);
      }
    }
    loadDirectories();
  }, [rootHandle, refreshTrigger]);

  if (!rootHandle) return null;

  return (
    <aside className="w-64 flex flex-col h-full border-r border-saffron-500/20 bg-vyasa-900/60 backdrop-blur-md shrink-0 p-4 overflow-y-auto">
      <h3 className="text-saffron-400 font-sans font-bold tracking-widest text-sm mb-6 uppercase border-b border-saffron-500/20 pb-2">
        Projetos (Workspaces)
      </h3>
      
      {directories.length === 0 ? (
        <p className="text-xs text-vyasa-100/50 italic">Nenhum projeto encontrado na raiz escolhida.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {directories.map((dir) => {
            const isOpen = projects.some(p => p.id === dir.name);
            return (
              <li key={dir.name}>
                <button
                  onClick={() => addProject({ id: dir.name, name: dir.name, handle: dir })}
                  disabled={isOpen}
                  className={`w-full text-left px-3 py-2.5 rounded text-sm tracking-wide transition-all flex items-center justify-between group
                    ${isOpen 
                      ? 'bg-saffron-500/20 text-saffron-400 border border-saffron-500/30 cursor-default shadow-[0_0_10px_rgba(244,180,26,0.1)]' 
                      : 'text-vyasa-100 bg-vyasa-800/20 hover:bg-vyasa-800 hover:text-white border border-transparent'
                    }`}
                >
                  <span className="truncate pr-2">{dir.name}</span>
                  {isOpen ? (
                    <span className="w-2 h-2 rounded-full bg-saffron-400 shadow-[0_0_5px_#f4b41a]"></span>
                  ) : (
                    <span className="text-vyasa-100/30 group-hover:text-vyasa-100/80">▶</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
};
