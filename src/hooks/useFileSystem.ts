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

        const perm = await (saved as any).queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          setRootHandle(saved);
        }
      } catch {
        await del(IDB_KEY);
      } finally {
        setIsRestoring(false);
      }
    }
    restore();
  }, []);

  // Tenta usar workspace salvo sem abrir picker (só requestPermission)
  const requestAccessSilent = useCallback(async () => {
    try {
      const saved = await get<FileSystemDirectoryHandle>(IDB_KEY).catch(() => null);
      if (!saved) return null;
      const perm = await (saved as any).requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        setRootHandle(saved);
        return saved;
      }
      return null;
    } catch {
      return null;
    }
  }, [setRootHandle]);

  // Abre picker de pasta explicitamente (usado só em "Abrir Projeto Existente")
  const openWithPicker = useCallback(async () => {
    try {
      setError(null);
      const handle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      await set(IDB_KEY, handle);
      setRootHandle(handle);
      return handle;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('Acesso negado ou navegador não suportado. Use Chrome ou Edge.');
      }
      return null;
    }
  }, [setRootHandle]);

  // Salva um handle como workspace (usado pelo wizard após criar pasta)
  const saveWorkspaceHandle = useCallback(async (handle: FileSystemDirectoryHandle) => {
    await set(IDB_KEY, handle);
    setRootHandle(handle);
  }, [setRootHandle]);

  const disconnect = useCallback(async () => {
    await del(IDB_KEY);
    setRootHandle(null);
  }, []);

  // Mantido para compatibilidade com App.tsx
  const requestAccess = openWithPicker;

  return { rootHandle, isGranted, isRestoring, requestAccess, requestAccessSilent, openWithPicker, saveWorkspaceHandle, disconnect, error };
}
