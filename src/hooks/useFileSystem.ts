import { useState, useCallback } from 'react';
import { useWorkspaceStore } from '../store/workspaceStore';

export function useFileSystem() {
  const { rootHandle, setRootHandle } = useWorkspaceStore();
  const [error, setError] = useState<string | null>(null);
  const isGranted = rootHandle !== null;

  const requestAccess = useCallback(async () => {
    try {
      setError(null);
      // Pede permissão explícita ao usuário para acessar a raiz do Workspace
      const handle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });
      
      setRootHandle(handle);
      return handle;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('Acesso negado ou navegador não suportado. Por favor, use Chrome ou Edge e conceda permissão.');
        console.error('File System Access Error:', err);
      }
      return null;
    }
  }, []);

  return { rootHandle, isGranted, requestAccess, error };
}
