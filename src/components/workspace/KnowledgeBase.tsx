import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface FileItem {
  name: string;
  handle: any; // FileSystemFileHandle
  content?: string;
}

export const KnowledgeBase: React.FC<{ projectHandle: any }> = ({ projectHandle }) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState<string>('');

  useEffect(() => {
    async function scanKnowledgeBase() {
      if (!projectHandle) return;
      try {
        setLoading(true);
        setError(null);
        
        // Tenta achar a pasta .agent
        let agentDir;
        try {
          agentDir = await projectHandle.getDirectoryHandle('.agent', { create: false });
        } catch {
          setError('Nenhum Nexus de Agentes (.agent) encontrado neste projeto.');
          return;
        }

        // Tenta achar a pasta knowledge
        let knowledgeDir;
        try {
          knowledgeDir = await agentDir.getDirectoryHandle('knowledge', { create: false });
        } catch {
          setError('A Bússola de Conhecimento (.agent/knowledge) está vazia ou não existe.');
          return;
        }

        // Lê todos os arquivos
        const mdFiles: FileItem[] = [];
        for await (const entry of knowledgeDir.values()) {
          if (entry.kind === 'file' && entry.name.endsWith('.md')) {
            mdFiles.push({ name: entry.name, handle: entry });
          }
        }

        setFiles(mdFiles.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (err: any) {
        console.error(err);
        setError('Falha ao escanear os tomos de sabedoria local.');
      } finally {
        setLoading(false);
      }
    }

    scanKnowledgeBase();
  }, [projectHandle]);

  const openFile = async (file: FileItem) => {
    try {
      const fileData = await file.handle.getFile();
      const text = await fileData.text();
      setSelectedFile(file);
      setFileContent(text);
    } catch (e) {
      console.error('Falha ao ler arquivo de conhecimento', e);
    }
  };

  if (loading) return <div className="animate-pulse text-vyasa-100/50 text-sm">Vasculhando a biblioteca...</div>;

  if (selectedFile) {
    return (
      <div className="flex flex-col h-full animate-in fade-in">
        <button 
          onClick={() => setSelectedFile(null)}
          className="self-start mb-4 text-xs font-bold text-saffron-500 hover:text-saffron-400 uppercase tracking-widest flex items-center gap-2 bg-vyasa-800/50 px-3 py-1 rounded"
        >
          <span>◀</span> Voltar ao Nexus
        </button>
        <h4 className="text-white font-serif text-lg mb-2 border-b border-vyasa-700 pb-2">{selectedFile.name}</h4>
        <div className="markdown-body text-vyasa-100 text-sm leading-relaxed overflow-x-hidden pt-2">
            <style>{`
            .markdown-body h1, .markdown-body h2, .markdown-body h3 { color: var(--color-sky-400); font-family: var(--font-sans); margin-top: 1.5em; margin-bottom: 0.5em; font-weight: bold; border-bottom: 1px solid rgba(56, 189, 248, 0.2); padding-bottom: 0.3em; line-height: 1.3;}
            .markdown-body h1 { font-size: 1.4rem; }
            .markdown-body h2 { font-size: 1.2rem; }
            .markdown-body h3 { font-size: 1.05rem; }
            .markdown-body p { margin-bottom: 1em; }
            .markdown-body ul { margin-bottom: 1em; padding-left: 1.5em; list-style-type: disc; }
            .markdown-body li { margin-bottom: 0.4em; }
            .markdown-body a { color: var(--color-sky-400); text-decoration: underline; }
            .markdown-body code { background: rgba(0,0,0,0.3); padding: 0.2em 0.4em; border-radius: 3px; font-family: monospace; font-size: 0.85em;  border: 1px solid rgba(255,255,255,0.05); }
            .markdown-body pre { background: rgba(0,0,0,0.4); padding: 1em; border-radius: 6px; overflow-x: auto; margin-bottom: 1em; border: 1px solid rgba(255,255,255,0.05); }
            .markdown-body pre code { background: none; padding: 0; border: none; font-size: 0.8em; }
            .markdown-body blockquote { border-left: 3px solid var(--color-sky-500); padding-left: 1em; color: rgba(226, 232, 240, 0.7); margin-left: 0; margin-bottom: 1em;}
            `}</style>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {fileContent}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-6 border-b border-saffron-500/10 pb-4">
        <h3 className="text-white font-bold tracking-wider uppercase text-sm mb-1 flex items-center gap-2">
          <span className="text-sky-400">✧</span> Base de Conhecimento AI
        </h3>
        <p className="text-xs text-vyasa-100/50">Memórias e diretrizes lidas da pasta <code>.agent/knowledge/</code></p>
      </div>

      {error ? (
        <div className="text-saffron-500/80 text-sm border border-saffron-500/20 p-4 rounded bg-vyasa-900/40 text-center">
          {error}
        </div>
      ) : files.length === 0 ? (
        <div className="text-vyasa-100/50 text-sm text-center italic p-4">
          Nenhum arquivo .md localizado nesta biblioteca.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {files.map(file => (
            <button
              key={file.name}
              onClick={() => openFile(file)}
              className="text-left bg-vyasa-800/40 hover:bg-vyasa-700/60 border border-sky-500/10 hover:border-sky-500/40 p-3 rounded transition-all group flex items-start gap-3"
            >
              <div className="mt-0.5 text-sky-400 opacity-70 group-hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
              </div>
              <div>
                <strong className="block text-sm text-vyasa-100 group-hover:text-white transition-colors">{file.name}</strong>
                <span className="text-[10px] text-vyasa-100/40 uppercase tracking-widest mt-1 block">Tomo de Sabedoria</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
