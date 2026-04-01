import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownViewerProps {
  projectHandle: any; // FileSystemDirectoryHandle nativo
}

const AUTO_REFRESH_MS = 5000;

export const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ projectHandle }) => {
  const [content, setContent] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fileHandle, setFileHandle] = useState<any>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [newTask, setNewTask] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const fileHandleRef = useRef<any>(null);
  const contentRef = useRef<string>('');

  // Lê o arquivo e retorna o texto, sem setar loading
  const readFile = async (handle: any): Promise<string> => {
    const file = await handle.getFile();
    return file.text();
  };

  useEffect(() => {
    async function loadMarkdown() {
      try {
        setLoading(true);
        let targetHandle;
        try {
          targetHandle = await projectHandle.getFileHandle('task.md');
        } catch {
          try {
            targetHandle = await projectHandle.getFileHandle('PLAN.md');
          } catch {
            throw new Error('Sem arquivo task.md ou PLAN.md na raiz deste projeto.');
          }
        }
        fileHandleRef.current = targetHandle;
        setFileHandle(targetHandle);
        const text = await readFile(targetHandle);
        contentRef.current = text;
        setContent(text);
        setLastSync(new Date());
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar o tomo de conhecimento.');
      } finally {
        setLoading(false);
      }
    }

    if (projectHandle) loadMarkdown();
  }, [projectHandle]);

  // Auto-refresh: relê o arquivo a cada 5s e atualiza só se mudou
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!fileHandleRef.current) return;
      try {
        const text = await readFile(fileHandleRef.current);
        if (text !== contentRef.current) {
          contentRef.current = text;
          setContent(text);
          setLastSync(new Date());
        }
      } catch {
        // silencia erros de polling
      }
    }, AUTO_REFRESH_MS);
    return () => clearInterval(interval);
  }, []);

  // Função crítica: Clique na Checkbox do App grava na hora no arquivo .md local
  const handleCheckboxToggle = async (index: number, isChecked: boolean) => {
    if (!fileHandle) return;
    
    let checkboxCount = 0;
    const lines = content.split('\n');
    let lineFound = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Encontra linhas que são - [ ] ou - [x]
        if (line.match(/^\s*[-*]\s*\[[ xX]\]/)) {
            if (checkboxCount === index) {
                // Inverte o estado EXATO onde estava na String original
                lines[i] = isChecked 
                  ? line.replace(/\[\s\]/, '[x]') 
                  : line.replace(/\[[xX]\]/, '[ ]');
                lineFound = true;
                break;
            }
            checkboxCount++;
        }
    }
    
    if (!lineFound) return;

    const newContent = lines.join('\n');
    contentRef.current = newContent;
    setContent(newContent); // Otimistic UI
    
    // Gravação Atômica usando File System API
    try {
      const writable = await fileHandle.createWritable();
      await writable.write(newContent);
      await writable.close();
      console.log('✅ Arquivo salvo diretamente na raiz (File System)');
    } catch (err) {
      console.error('Falha de escrita local:', err);
    }
  };

  const handleAddTask = async () => {
    if (!fileHandleRef.current || !newTask.trim()) return;
    setAddingTask(true);
    const line = `\n- [ ] ${newTask.trim()}`;
    const updated = contentRef.current + line;
    contentRef.current = updated;
    setContent(updated);
    setNewTask('');
    try {
      const writable = await fileHandleRef.current.createWritable();
      await writable.write(updated);
      await writable.close();
    } catch (err) {
      console.error('Falha ao adicionar task:', err);
    } finally {
      setAddingTask(false);
    }
  };

  if (loading) return <div className="text-vyasa-100/50 animate-pulse text-sm">Decifrando tomo de conhecimento...</div>;
  if (error) return <div className="text-saffron-500/80 text-sm border border-saffron-500/20 p-4 rounded bg-vyasa-900/40">{error}</div>;

  const syncLabel = lastSync
    ? `Sync ${lastSync.getHours().toString().padStart(2,'0')}:${lastSync.getMinutes().toString().padStart(2,'0')}:${lastSync.getSeconds().toString().padStart(2,'0')}`
    : '';

  // Contador mutável para indexar cada checkbox sequencialmente durante o render react-markdown
  let currentCheckboxIndex = 0;
  
  return (
    <div className="markdown-body text-vyasa-100 text-sm leading-relaxed overflow-x-hidden">
      {/* Badge de live sync */}
      <div className="flex items-center gap-1.5 mb-4 opacity-50 hover:opacity-100 transition-opacity">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
        <span className="text-[10px] text-emerald-400 tracking-widest uppercase font-mono">Live · {syncLabel}</span>
      </div>
      <style>{`
        .markdown-body h1, .markdown-body h2, .markdown-body h3 { color: var(--color-saffron-400); font-family: var(--font-serif); margin-top: 1.5em; margin-bottom: 0.5em; font-weight: bold; border-bottom: 1px solid rgba(244, 180, 26, 0.2); padding-bottom: 0.3em; line-height: 1.3;}
        .markdown-body h1 { font-size: 1.4rem; }
        .markdown-body h2 { font-size: 1.2rem; }
        .markdown-body h3 { font-size: 1.05rem; }
        .markdown-body p { margin-bottom: 1em; }
        .markdown-body ul { margin-bottom: 1em; padding-left: 1.5em; list-style-type: disc; }
        .markdown-body li { margin-bottom: 0.4em; }
        .markdown-body a { color: var(--color-saffron-400); text-decoration: underline; }
        .markdown-body code { background: rgba(0,0,0,0.3); padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; font-size: 0.85em;  border: 1px solid rgba(255,255,255,0.05); }
        .markdown-body pre { background: rgba(0,0,0,0.4); padding: 1em; border-radius: 6px; overflow-x: auto; margin-bottom: 1em; border: 1px solid rgba(255,255,255,0.05); }
        .markdown-body pre code { background: none; padding: 0; border: none; font-size: 0.8em; }
        .markdown-body blockquote { border-left: 3px solid var(--color-saffron-500); padding-left: 1em; color: rgba(226, 232, 240, 0.7); margin-left: 0; margin-bottom: 1em;}
        
        .task-list-item { list-style-type: none !important; margin-left: -1.5em; display: flex; align-items: flex-start; gap: 0.6em; transition: opacity 0.3s;}
        .task-list-item input[type="checkbox"] {
          appearance: none; min-width: 16px; height: 16px; border: 1px solid var(--color-saffron-500); border-radius: 3px; background: rgba(10, 14, 23, 0.5); cursor: pointer; position: relative; margin-top: 0.2em; transition: all 0.2s;
        }
        .task-list-item input[type="checkbox"]:checked { background: var(--color-saffron-500); box-shadow: 0 0 10px rgba(244, 180, 26, 0.5); border-color: transparent;}
        .task-list-item input[type="checkbox"]:checked::after { content: '✔'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: var(--color-vyasa-900); font-size: 10px; font-weight: bold; }
        .task-list-item.checked { text-decoration: line-through; opacity: 0.4; }
        .task-list-item:hover { opacity: 1; }
      `}</style>

      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          li: ({ node, className, children, ...props }: any) => {
            const isTask = className?.includes('task-list-item');
            if (isTask) {
              return <li className={`task-list-item ${props.checked ? 'checked' : ''}`} {...props}>{children}</li>;
            }
            return <li {...props}>{children}</li>;
          },
          input: ({ node, checked, type, ...props }: any) => {
            if (type !== 'checkbox') return <input type={type} {...props as any} />;
            
            const index = currentCheckboxIndex++;
            return (
              <input 
                type="checkbox" 
                checked={checked} 
                onChange={(e) => handleCheckboxToggle(index, e.target.checked)}
              />
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>

      {/* Campo de nova task */}
      <div className="mt-6 pt-4 border-t border-saffron-500/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            placeholder="+ Nova task... (Enter para salvar)"
            className="flex-grow bg-vyasa-800/40 border border-saffron-500/15 focus:border-saffron-500/40 rounded px-3 py-2 text-xs text-white placeholder-vyasa-100/25 outline-none transition-colors"
          />
          <button
            onClick={handleAddTask}
            disabled={addingTask || !newTask.trim()}
            className="text-xs bg-saffron-500/10 border border-saffron-500/30 text-saffron-400 hover:bg-saffron-500/20 px-3 py-2 rounded transition-all disabled:opacity-30"
          >
            {addingTask ? '...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
};
