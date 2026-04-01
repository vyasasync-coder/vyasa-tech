import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { streamAI, parseFileWrites, stripFileWrites, type AIMessage } from '../../lib/ai';
import { useWorkspaceStore } from '../../store/workspaceStore';

// ── Tipos ──────────────────────────────────────────────────────────────────
type Phase = 'brainstorm' | 'planning' | 'architecture';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  filesWritten?: string[];
}

interface InceptionChatProps {
  projectHandle: any; // FileSystemDirectoryHandle do projeto
  projectName: string;
  onFinish: () => void; // Vai para o dashboard
}

// ── Carrega skill do filesystem ────────────────────────────────────────────
async function loadSkillFile(rootHandle: any, path: string): Promise<string> {
  try {
    const parts = path.split('/');
    let current = rootHandle;
    for (const part of parts.slice(0, -1)) {
      current = await current.getDirectoryHandle(part, { create: false });
    }
    const fileHandle = await current.getFileHandle(parts[parts.length - 1]);
    const file = await fileHandle.getFile();
    return file.text();
  } catch {
    return '';
  }
}

// ── System prompts por fase ────────────────────────────────────────────────
function buildSystemPrompt(
  phase: Phase,
  projectName: string,
  skills: Record<string, string>
): string {
  const base = `Você é o Agente de Inception do Vyasa Sync, operando dentro da metodologia Antigravity Kit.
Projeto atual: **${projectName}**
Fase atual: **${phase.toUpperCase()}**

REGRA CRÍTICA: Durante as fases brainstorm e planning, NENHUMA linha de código deve ser gerada.
Apenas documentos .md são produzidos.

Para escrever um arquivo no projeto, use EXATAMENTE este formato:
<write_file path="nome-do-arquivo.md">
conteúdo do arquivo aqui
</write_file>

Os arquivos são salvos na pasta raiz do projeto automaticamente.

---

${skills['project-planner'] ? `## AGENTE: Project Planner\n${skills['project-planner']}\n\n---\n` : ''}
`;

  if (phase === 'brainstorm') {
    return base + `## SKILL ATIVA: Brainstorming (Portão Socrático)
${skills['brainstorming'] || ''}

Inicie SEMPRE com o Portão Socrático: faça 3 perguntas investigativas sobre o projeto antes de qualquer coisa.
Não sugira soluções técnicas ainda. Apenas entenda o problema, o público e os objetivos.`;
  }

  if (phase === 'planning') {
    return base + `## SKILL ATIVA: Plan Writing
${skills['plan-writing'] || ''}

Crie o plano estruturado do projeto com base no que foi discutido no brainstorm.
Escreva os arquivos task.md e implementation_plan.md usando <write_file>.
task.md deve ter checkboxes - [ ] para cada fase de execução.
NENHUM código ainda.`;
  }

  if (phase === 'architecture') {
    return base + `## FASE: Arquitetura e Handoff
Com base no planejamento aprovado:
1. Defina o stack tecnológico final com justificativa
2. Escreva o arquivo .cursorrules otimizado para o projeto usando <write_file path=".cursorrules">
3. Gere um PRD.md completo usando <write_file path="PRD.md">
4. Aguarde aprovação do usuário antes de sinalizar conclusão.

NENHUM código de aplicação. Apenas documentação e regras.`;
  }

  return base;
}

// ── Componente principal ───────────────────────────────────────────────────
export const InceptionChat: React.FC<InceptionChatProps> = ({
  projectHandle,
  projectName,
  onFinish,
}) => {
  const { rootHandle } = useWorkspaceStore();
  const [phase, setPhase] = useState<Phase>('brainstorm');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [skills, setSkills] = useState<Record<string, string>>({});
  const [contextDoc, setContextDoc] = useState('');
  const [showContextForm, setShowContextForm] = useState(false);
  const [filesGenerated, setFilesGenerated] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Carrega skills do filesystem ao montar
  useEffect(() => {
    async function load() {
      if (!rootHandle) return;
      const [brainstorm, planWriting, projectPlanner] = await Promise.all([
        loadSkillFile(rootHandle, '.agent/skills/brainstorming/SKILL.md'),
        loadSkillFile(rootHandle, '.agent/skills/plan-writing/SKILL.md'),
        loadSkillFile(rootHandle, '.agent/agents/project-planner.md'),
      ]);
      setSkills({
        brainstorming: brainstorm,
        'plan-writing': planWriting,
        'project-planner': projectPlanner,
      });
    }
    load();
  }, [rootHandle]);

  // Mensagem inicial ao entrar em cada fase
  useEffect(() => {
    if (messages.length === 0 && Object.keys(skills).length > 0) {
      setMessages([{
        id: 'welcome',
        role: 'system',
        content: `**Inception iniciado — Fase: ${phase.toUpperCase()}**\n\nSkills carregadas: brainstorming, plan-writing, project-planner\n\nDigite sua primeira mensagem ou importe um documento de contexto (público-alvo, ID visual, etc).`,
      }]);
      // Auto-dispara a primeira mensagem do agente
      sendInitialGreeting();
    }
  }, [skills]);

  const sendInitialGreeting = async () => {
    if (isStreaming) return;
    setIsStreaming(true);
    const systemPrompt = buildSystemPrompt(phase, projectName, skills);
    const initMsg: AIMessage = {
      role: 'user',
      content: `Iniciando projeto: "${projectName}". Por favor, comece o Portão Socrático.`,
    };

    let fullText = '';
    const assistantId = Date.now().toString();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      await streamAI([initMsg], systemPrompt, (chunk) => {
        fullText += chunk;
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m)
        );
      });
    } catch (err: any) {
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: `❌ ${err.message}` } : m)
      );
    } finally {
      setIsStreaming(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Escreve arquivo no projeto via File System API
  const writeFile = async (path: string, content: string): Promise<boolean> => {
    try {
      const parts = path.split('/');
      let dir = projectHandle;
      for (const part of parts.slice(0, -1)) {
        dir = await dir.getDirectoryHandle(part, { create: true });
      }
      const fileHandle = await dir.getFileHandle(parts[parts.length - 1], { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (err) {
      console.error('[InceptionChat] writeFile error:', err);
      return false;
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text };
    setInput('');
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    // Constrói histórico para a API (sem mensagens de sistema)
    const history: AIMessage[] = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    // Adiciona contexto externo se existir
    const contextPrefix = contextDoc
      ? `[CONTEXTO EXTERNO IMPORTADO PELO USUÁRIO]\n${contextDoc}\n\n[MENSAGEM DO USUÁRIO]\n`
      : '';

    history.push({ role: 'user', content: contextPrefix + text });

    const systemPrompt = buildSystemPrompt(phase, projectName, skills);
    let fullText = '';
    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      await streamAI(history, systemPrompt, (chunk) => {
        fullText += chunk;
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m)
        );
      });

      // Processa file writes na resposta
      const writes = parseFileWrites(fullText);
      const written: string[] = [];
      for (const w of writes) {
        const ok = await writeFile(w.path, w.content);
        if (ok) written.push(w.path);
      }

      if (written.length > 0) {
        setFilesGenerated(prev => [...new Set([...prev, ...written])]);
        const displayText = stripFileWrites(fullText);
        setMessages(prev =>
          prev.map(m => m.id === assistantId
            ? { ...m, content: displayText, filesWritten: written }
            : m
          )
        );
      }

      // Limpa contexto após usar
      if (contextDoc) setContextDoc('');

    } catch (err: any) {
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: `❌ ${err.message}` } : m)
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const switchPhase = (newPhase: Phase) => {
    setPhase(newPhase);
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'system',
      content: `**Fase alterada para: ${newPhase.toUpperCase()}**`,
    }]);
  };

  const PHASES: { id: Phase; label: string; desc: string }[] = [
    { id: 'brainstorm', label: '1. Brainstorm', desc: 'Portão Socrático' },
    { id: 'planning', label: '2. Planejamento', desc: 'Gera task.md + plano' },
    { id: 'architecture', label: '3. Arquitetura', desc: 'Stack + .cursorrules + PRD' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex bg-vyasa-900">

      {/* ── SIDEBAR DE FASES ── */}
      <div className="w-56 shrink-0 border-r border-saffron-500/15 flex flex-col bg-vyasa-900/80 backdrop-blur-md p-4">
        <div className="mb-6">
          <p className="text-[10px] text-saffron-400/50 tracking-[0.3em] uppercase mb-1">Projeto</p>
          <p className="text-white font-bold text-sm truncate">{projectName}</p>
        </div>

        <p className="text-[10px] text-vyasa-100/30 tracking-widest uppercase mb-3">Fases</p>
        <div className="space-y-1.5">
          {PHASES.map((p) => (
            <button
              key={p.id}
              onClick={() => switchPhase(p.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg transition-all ${
                phase === p.id
                  ? 'bg-saffron-500/15 border border-saffron-500/40 text-saffron-400'
                  : 'text-vyasa-100/40 hover:text-vyasa-100/70 hover:bg-vyasa-800/40 border border-transparent'
              }`}
            >
              <p className="text-xs font-bold">{p.label}</p>
              <p className="text-[10px] opacity-60 mt-0.5">{p.desc}</p>
            </button>
          ))}
        </div>

        {/* Arquivos gerados */}
        {filesGenerated.length > 0 && (
          <div className="mt-6">
            <p className="text-[10px] text-emerald-400/60 tracking-widest uppercase mb-2">Arquivos gerados</p>
            <div className="space-y-1">
              {filesGenerated.map((f) => (
                <div key={f} className="flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <span>✓</span>
                  <span className="font-mono truncate">{f}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Importar contexto */}
        <div className="mt-auto space-y-2">
          <button
            onClick={() => setShowContextForm(!showContextForm)}
            className="w-full text-xs text-vyasa-100/40 hover:text-saffron-400 border border-saffron-500/10 hover:border-saffron-500/30 rounded px-3 py-2 transition-all text-left"
          >
            📎 Importar Contexto
          </button>

          {phase === 'architecture' && filesGenerated.length > 0 && (
            <button
              onClick={onFinish}
              className="w-full bg-gradient-to-r from-saffron-600 to-saffron-500 text-vyasa-900 font-black text-xs py-3 rounded-lg tracking-widest uppercase hover:opacity-90 transition-all"
            >
              → Dashboard
            </button>
          )}
        </div>
      </div>

      {/* ── ÁREA DE CHAT ── */}
      <div className="flex-grow flex flex-col min-w-0">

        {/* Header */}
        <div className="shrink-0 px-6 py-3 border-b border-saffron-500/10 flex items-center justify-between bg-vyasa-900/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <img src="/logo-vyasa.png" alt="" className="w-7 h-7 rounded-full object-cover opacity-80" />
            <span className="text-sm text-saffron-400 font-bold tracking-widest uppercase">Vyasa Inception</span>
            <span className="text-[10px] bg-saffron-500/10 border border-saffron-500/20 text-saffron-400/70 px-2 py-0.5 rounded-full tracking-widest uppercase">
              {phase}
            </span>
          </div>
          <button
            onClick={onFinish}
            className="text-xs text-vyasa-100/30 hover:text-vyasa-100/60 transition-colors"
          >
            Sair sem finalizar
          </button>
        </div>

        {/* Form de contexto externo */}
        {showContextForm && (
          <div className="shrink-0 px-6 py-3 border-b border-saffron-500/10 bg-vyasa-800/30">
            <p className="text-xs text-vyasa-100/50 mb-2">Cole aqui seu mapa de público-alvo, ID visual, briefing externo, etc:</p>
            <textarea
              value={contextDoc}
              onChange={(e) => setContextDoc(e.target.value)}
              rows={4}
              placeholder="Cole o documento aqui em texto ou markdown..."
              className="w-full bg-vyasa-800/60 border border-saffron-500/20 rounded px-3 py-2 text-xs text-white placeholder-vyasa-100/20 outline-none font-mono resize-none"
            />
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => setShowContextForm(false)}
                className="text-xs bg-saffron-500/10 border border-saffron-500/30 text-saffron-400 px-3 py-1.5 rounded hover:bg-saffron-500/20 transition-all"
              >
                Confirmar contexto
              </button>
              {contextDoc && <span className="text-[11px] text-emerald-400">✓ Será incluído na próxima mensagem</span>}
            </div>
          </div>
        )}

        {/* Mensagens */}
        <div className="flex-grow overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((msg) => (
            <div key={msg.id}>
              {msg.role === 'system' ? (
                <div className="flex justify-center">
                  <span className="text-[11px] text-vyasa-100/30 bg-vyasa-800/30 px-3 py-1 rounded-full border border-saffron-500/10">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                  </span>
                </div>
              ) : msg.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="max-w-[75%] bg-saffron-500/10 border border-saffron-500/20 rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-white">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-vyasa-800 border border-saffron-500/30 flex items-center justify-center shrink-0 mt-1">
                    <span className="text-saffron-400 text-[10px] font-bold">V</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="prose prose-invert prose-sm max-w-none text-vyasa-100 text-sm leading-relaxed">
                      <style>{`
                        .prose h1,.prose h2,.prose h3{color:var(--color-saffron-400);font-family:var(--font-serif);border-bottom:1px solid rgba(244,180,26,0.15);padding-bottom:0.3em;margin-top:1.2em;}
                        .prose code{background:rgba(0,0,0,0.3);padding:0.15em 0.35em;border-radius:3px;font-size:0.82em;border:1px solid rgba(255,255,255,0.05);}
                        .prose pre{background:rgba(0,0,0,0.4);padding:0.8em;border-radius:6px;overflow-x:auto;border:1px solid rgba(255,255,255,0.05);}
                        .prose pre code{background:none;padding:0;border:none;}
                        .prose table{border-collapse:collapse;width:100%;}
                        .prose th{background:rgba(244,180,26,0.1);color:var(--color-saffron-400);padding:0.4em 0.8em;text-align:left;font-size:0.8em;letter-spacing:0.05em;}
                        .prose td{padding:0.35em 0.8em;border-bottom:1px solid rgba(255,255,255,0.05);font-size:0.85em;}
                        .prose ul,.prose ol{padding-left:1.4em;}
                        .prose li{margin-bottom:0.3em;}
                        .prose blockquote{border-left:3px solid var(--color-saffron-500);padding-left:0.8em;color:rgba(226,232,240,0.6);}
                        .prose strong{color:#fff;}
                      `}</style>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content || (isStreaming ? '▋' : '')}
                      </ReactMarkdown>
                    </div>
                    {msg.filesWritten && msg.filesWritten.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {msg.filesWritten.map((f) => (
                          <span key={f} className="text-[11px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono">
                            ✓ {f}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 px-6 py-4 border-t border-saffron-500/10 bg-vyasa-900/60">
          {contextDoc && (
            <div className="mb-2 flex items-center gap-2 text-[11px] text-emerald-400">
              <span>📎</span>
              <span>Contexto externo será enviado junto</span>
              <button onClick={() => setContextDoc('')} className="text-vyasa-100/30 hover:text-red-400 ml-auto">✕</button>
            </div>
          )}
          <div className="flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
              rows={2}
              placeholder={isStreaming ? 'Aguardando resposta...' : 'Mensagem... (Enter para enviar, Shift+Enter para nova linha)'}
              className="flex-grow bg-vyasa-800/60 border border-saffron-500/20 focus:border-saffron-500/50 rounded-xl px-4 py-3 text-sm text-white placeholder-vyasa-100/25 outline-none resize-none transition-colors disabled:opacity-50"
            />
            <button
              onClick={send}
              disabled={isStreaming || !input.trim()}
              className="bg-gradient-to-r from-saffron-600 to-saffron-500 text-vyasa-900 font-black px-5 py-3 rounded-xl hover:opacity-90 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              {isStreaming ? (
                <span className="w-4 h-4 rounded-full border-2 border-vyasa-900 border-t-transparent animate-spin block" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
