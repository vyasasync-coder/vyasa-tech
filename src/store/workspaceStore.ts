import { create } from 'zustand';

export interface Project {
  id: string;
  name: string;
  handle?: any; // Directory handle for this specific project
}

interface WorkspaceState {
  rootHandle: any; // O FileSystemDirectoryHandle nativo do navegador
  setRootHandle: (handle: any) => void;
  projects: Project[];
  activeProjectIndex: number;
  addProject: (p: Project) => void;
  removeProject: (id: string) => void;
  setActiveIndex: (index: number) => void;
  nextProject: () => void;
  prevProject: () => void;
  showGlobalKB: boolean;
  setShowGlobalKB: (v: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  rootHandle: null,
  setRootHandle: (handle) => set({ rootHandle: handle }),
  projects: [],
  activeProjectIndex: 0,
  showGlobalKB: false,
  setShowGlobalKB: (v) => set({ showGlobalKB: v }),
  
  addProject: (project) => 
    set((state) => {
      // Ignora duplicados
      if (state.projects.find(p => p.id === project.id)) return state;
      return { projects: [...state.projects, project] };
    }),
    
  removeProject: (id) => 
    set((state) => {
      const filtered = state.projects.filter(p => p.id !== id);
      return {
        projects: filtered,
        activeProjectIndex: Math.max(0, Math.min(state.activeProjectIndex, filtered.length - 4))
      };
    }),
    
  setActiveIndex: (index) => set({ activeProjectIndex: index }),
  
  nextProject: () => set((state) => ({
    activeProjectIndex: Math.min(state.projects.length - 4, state.activeProjectIndex + 1)
  })),
  
  prevProject: () => set((state) => ({
    activeProjectIndex: Math.max(0, state.activeProjectIndex - 1)
  }))
}));
