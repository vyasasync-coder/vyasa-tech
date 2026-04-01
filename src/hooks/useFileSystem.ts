import { useState, useCallback, useEffect } from 'react';
import { get, set, del } from 'idb-keyval';
import { useWorkspaceStore } from '../store/workspaceStore';

const IDB_KEY = 'vyasa-workspace-handle';

export function useFileSystem() {
  const { rootHandle, setRootHandle } = useWorkspaceStore();
  const [error, setError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  const isGranted = rootHandle !== null;

  // Tenta restaurar o handle salvo no IndexedDB ao montar
  useEffect(() => {
    async function restore() {
      try {
        const saved = await get<FileSystemDirectoryHandle>(IDB_KEY);
        if (!saved) { setIsRestoring(false); return; }

        // Verifica se a permissão ainda está ativa
        const perm = await (saved as any).queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          setRootHandle(saved);
        }
        // Se 'prompt', aguarda o usuário clicar — não abre o picker automaticamente
      } catch {
        await del(IDB_KEY); // handle inválido, remove
      } finally {
        setIsRestoring(false);
      }
    }
    restore();
  }, []);

  const requestAccess = useCallback(async () => {
    try {
      setError(null);

      // Se já temos um handle salvo mas precisamos de re-permissão, tenta sem abrir picker
      const saved = await get<FileSystemDirectoryHandle>(IDB_KEY).catch(() => null);
      if (saved) {
        const perm = await (saved as any).requestPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          setRootHandle(saved);
          return saved;
        }
      }

      // Abre o picker para selecionar pasta
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      await set(IDB_KEY, handle); // salva no IndexedDB
      setRootHandle(handle);
      return handle;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('Acesso negado ou navegador não suportado. Use Chrome ou Edge.');
        console.error('File System Access Error:', err);
      }
      return null;
    }
  }, []);

  const disconnect = useCallback(async () => {
    await del(IDB_KEY);
    setRootHandle(null);
  }, []);

  return { rootHandle, isGranted, isRestoring, requestAccess, disconnect, error };
}
