import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useWorkspaceStore } from '../../store/workspaceStore';

const KB_FOLDER = '.vyasa-knowledge';

interface KBEntry {
  name: string;
  handle: any;
  title: string;
  tags: string[];
  content?: string;
}

// Extrai frontmatter simples (---\nkey: value\n---) do markdown
function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta: Record<string, string> = {};
  match[1].split('\n').forEach((line) => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) meta[key.trim()] = rest.join(':').trim();
  });
  return { meta, body: match[2] };
}

function parseTags(tagsStr: string): string[] {
  return tagsStr
    .replace(/[\[\]]/g, '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

// Gera slug de nome de arquivo a partir de título ou texto
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const GlobalKnowledgeBank: React.FC = () => {
  const { rootHandle, setShowGlobalKB } = useWorkspaceStore();
  const [entries, setEntries] = useState<KBEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<KBEntry | null>(null);
  const [search, setSearch] = useState('');
  const [kbDirHandle, setKbDirHandle] = useState<any>(null);

  // Formulário de nova entrada
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newContent, setNewContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const loadEntries = async (dir: any) => {
    const items: KBEntry[] = [];
    for await (const entry of dir.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.md')) {
        const file = await entry.getFile();
        const raw = await file.text();
        const { meta } = parseFrontmatter(raw);
        items.push({
          name: entry.name,
          handle: entry,
          title: meta.title || entry.name.replace('.md', ''),
          tags: meta.tags ? parseTags(meta.tags) : [],
        });
      }
    }
    setEntries(items.sort((a, b) => a.title.localeCompare(b.title)));
  };

  useEffect(() => {
    async function init() {
      if (!rootHandle) return;
      setLoading(true);
      try {
        const dir = await rootHandle.getDirectoryHandle(KB_FOLDER, { create: true });
        setKbDirHandle(dir);
        await loadEntries(dir);
      } catch (err) {
        console.error('[GlobalKB] Erro ao abrir pasta:', err);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [rootHandle]);

  const openEntry = async (entry: KBEntry) => {
    if (!entry.content) {
      const file = await entry.handle.getFile();
      const raw = await file.text();
      const { body } = parseFrontmatter(raw);
      entry.content = body;
    }
    setSelected({ ...entry });
  };

  // Verifica por keywords/tags se já existe antes de salvar
  const checkDuplicate = (title: string, tags: string[]): KBEntry | undefined => {
    const titleSlug = slugify(title);
    return entries.find((e) => {
      const eSlug = slugify(e.title);
      if (eSlug === titleSlug) return true;
      if (tags.length > 0 && e.tags.some((t) => tags.includes(t))) {
        // só considera duplicata se o título for parecido E tiver tag em comum
        const similarity = eSlug.split('-').filter((w) => titleSlug.includes(w)).length;
        return similarity >= 2;
      }
      return false;
    });
  };

  const saveEntry = async () => {
    if (!kbDirHandle || !newTitle.trim() || !newContent.trim()) return;
    setSaving(true);
    setSaveMsg('');

    const tagsArr = newTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const dupe = checkDuplicate(newTitle, tagsArr);
    if (dupe) {
      setSaveMsg(`⚠ Já existe: "${dupe.title}"`);
      setSaving(false);
      return;
    }

    const filename = `${slugify(newTitle)}.md`;
    const frontmatter = `---\ntitle: ${newTitle}\ntags: [${tagsArr.join(', ')}]\ncreated: ${new Date().toISOString().split('T')[0]}\n---\n\n`;
    const fullContent = frontmatter + newContent.trim();

    try {
      const fileHandle = await kbDirHandle.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(fullContent);
      await writable.close();

      setSaveMsg('✓ Salvo no Knowledge Bank!');
      setNewTitle('');
      setNewTags('');
      setNewContent('');
      setShowForm(false);
      await loadEntries(kbDirHandle);
    } catch (err) {
      setSaveMsg('Erro ao salvar.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const filtered = entries.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex flex-col h-full w-full bg-vyasa-900/80 backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-saffron-500/20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
          </div>
          <div>
            <h2 className="text-white font-serif text-lg tracking-wide">Knowledge Bank Global</h2>
            <p className="text-[11px] text-vyasa-100/40 tracking-widest">
              {KB_FOLDER}/ · {entries.length} entradas · acessível a todos os projetos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 px-3 py-1.5 rounded tracking-widest uppercase font-bold transition-all"
          >
            + Nova Entrada
          </button>
          <button
            onClick={() => setShowGlobalKB(false)}
            className="text-vyasa-100/40 hover:text-white transition-colors p-1.5"
            title="Voltar ao Workspace"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* Formulário nova entrada */}
      {showForm && (
        <div className="px-6 py-4 border-b border-emerald-500/10 bg-vyasa-800/30 shrink-0 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-vyasa-100/40 tracking-widest uppercase block mb-1">Título</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Como criar repo no GitHub"
                className="w-full bg-vyasa-800/60 border border-saffron-500/20 focus:border-saffron-500/50 rounded px-3 py-2 text-sm text-white placeholder-vyasa-100/20 outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-vyasa-100/40 tracking-widest uppercase block mb-1">Tags (vírgula)</label>
              <input
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="github, git, repositório"
                className="w-full bg-vyasa-800/60 border border-saffron-500/20 focus:border-saffron-500/50 rounded px-3 py-2 text-sm text-white placeholder-vyasa-100/20 outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-vyasa-100/40 tracking-widest uppercase block mb-1">Conteúdo (Markdown)</label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={5}
              placeholder="Descreva a solução, passo a passo..."
              className="w-full bg-vyasa-800/60 border border-saffron-500/20 focus:border-saffron-500/50 rounded px-3 py-2 text-sm text-white placeholder-vyasa-100/20 outline-none font-mono resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={saveEntry}
              disabled={saving}
              className="text-xs bg-emerald-500 text-vyasa-900 font-bold px-4 py-2 rounded tracking-widest uppercase hover:opacity-90 transition-all disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button onClick={() => setShowForm(false)} className="text-xs text-vyasa-100/40 hover:text-white">Cancelar</button>
            {saveMsg && <span className={`text-xs ${saveMsg.startsWith('⚠') ? 'text-yellow-400' : 'text-emerald-400'}`}>{saveMsg}</span>}
          </div>
        </div>
      )}

      <div className="flex flex-grow overflow-hidden">
        {/* Lista */}
        <div className="w-72 shrink-0 border-r border-saffron-500/10 flex flex-col">
          <div className="px-4 py-3 border-b border-saffron-500/10">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título ou tag..."
              className="w-full bg-vyasa-800/50 border border-saffron-500/15 rounded px-3 py-2 text-xs text-white placeholder-vyasa-100/30 outline-none"
            />
          </div>
          <div className="flex-grow overflow-y-auto px-3 py-3 space-y-1.5">
            {loading ? (
              <p className="text-xs text-vyasa-100/40 animate-pulse px-2">Carregando banco...</p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-vyasa-100/30 italic px-2 text-center mt-8">
                {search ? 'Nenhum resultado.' : 'Banco vazio. Adicione a primeira entrada!'}
              </p>
            ) : (
              filtered.map((e) => (
                <button
                  key={e.name}
                  onClick={() => openEntry(e)}
                  className={`w-full text-left px-3 py-2.5 rounded transition-all group ${
                    selected?.name === e.name
                      ? 'bg-emerald-500/15 border border-emerald-500/30'
                      : 'hover:bg-vyasa-800/50 border border-transparent'
                  }`}
                >
                  <p className={`text-sm font-medium truncate ${selected?.name === e.name ? 'text-emerald-300' : 'text-vyasa-100 group-hover:text-white'}`}>
                    {e.title}
                  </p>
                  {e.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {e.tags.slice(0, 3).map((t) => (
                        <span key={t} className="text-[9px] bg-vyasa-700/60 text-vyasa-100/50 px-1.5 py-0.5 rounded tracking-wide">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-grow overflow-y-auto p-8">
          {selected ? (
            <div className="max-w-3xl mx-auto">
              <div className="mb-6">
                <h3 className="text-2xl font-serif text-white mb-2">{selected.title}</h3>
                <div className="flex flex-wrap gap-2">
                  {selected.tags.map((t) => (
                    <span key={t} className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded tracking-widest">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="markdown-body text-vyasa-100 text-sm leading-relaxed">
                <style>{`
                  .markdown-body h1,.markdown-body h2,.markdown-body h3{color:#34d399;font-family:var(--font-serif);margin-top:1.5em;margin-bottom:0.5em;border-bottom:1px solid rgba(52,211,153,0.2);padding-bottom:0.3em;}
                  .markdown-body p{margin-bottom:1em;}
                  .markdown-body ul,.markdown-body ol{margin-bottom:1em;padding-left:1.5em;}
                  .markdown-body li{margin-bottom:0.4em;}
                  .markdown-body code{background:rgba(0,0,0,0.3);padding:0.2em 0.4em;border-radius:3px;font-family:monospace;font-size:0.85em;border:1px solid rgba(255,255,255,0.05);}
                  .markdown-body pre{background:rgba(0,0,0,0.4);padding:1em;border-radius:6px;overflow-x:auto;margin-bottom:1em;border:1px solid rgba(255,255,255,0.05);}
                  .markdown-body pre code{background:none;padding:0;border:none;}
                  .markdown-body blockquote{border-left:3px solid #34d399;padding-left:1em;color:rgba(226,232,240,0.7);margin-left:0;margin-bottom:1em;}
                `}</style>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.content || ''}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400/60"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              </div>
              <p className="text-vyasa-100/30 text-sm">Selecione uma entrada para ler</p>
              <p className="text-vyasa-100/20 text-xs mt-1">ou adicione novo conhecimento ao banco</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
