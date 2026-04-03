import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { streamAI, parseFileWrites, stripFileWrites, getDefaultModel, type AIMessage, type ModelOption } from '../../lib/ai';
import { ModelSelector } from './ModelSelector';
import { useWorkspaceStore } from '../../store/workspaceStore';

// ── Tipos ──────────────────────────────────────────────────────────────────
type Phase = 'brainstorm' | 'planning' | 'architecture';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  filesWritten?: string[];
  options?: string[]; // opções detectadas na resposta
}

interface SkillEntry {
  name: string;
  path: string;
  content: string;
}

interface InceptionChatProps {
  projectHandle: any;
  projectName: string;
  onFinish: () => void;
  inline?: boolean; // renderiza dentro do painel em vez de fullscreen
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

// ── Descobre todas as skills disponíveis ──────────────────────────────────
async function discoverSkills(rootHandle: any): Promise<SkillEntry[]> {
  const skills: SkillEntry[] = [];
  try {
    const agentDir = await rootHandle.getDirectoryHandle('.agent', { create: false });
    const skillsDir = await agentDir.getDirectoryHandle('skills', { create: false });
    for await (const entry of (skillsDir as any).values()) {
      if (entry.kind !== 'directory') continue;
      try {
        const skillMd = await loadSkillFile(rootHandle, `.agent/skills/${entry.name}/SKILL.md`);
        if (skillMd) {
          skills.push({ name: entry.name, path: `.agent/skills/${entry.name}/SKILL.md`, content: skillMd });
        }
      } catch {}
    }
    // Também carrega agents
    const agentsDir = await agentDir.getDirectoryHandle('agents', { create: false });
    for await (const entry of (agentsDir as any).values()) {
      if (entry.kind !== 'file' || !entry.name.endsWith('.md')) continue;
      try {
        const content = await loadSkillFile(rootHandle, `.agent/agents/${entry.name}`);
        if (content) {
          skills.push({ name: `@${entry.name.replace('.md', '')}`, path: `.agent/agents/${entry.name}`, content });
        }
      } catch {}
    }
  } catch {}
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

// ── Extrai opções da resposta (todos os blocos <opcoes>A|B|C</opcoes>) ─────
function extractOptions(text: string): { clean: string; options: string[] } {
  const allOptions: string[] = [];
  const regex = /<opcoes>([\s\S]*?)<\/opcoes>/gi;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const opts = match[1].split('|').map((o: string) => o.trim()).filter(Boolean);
    allOptions.push(...opts);
  }
  const clean = text.replace(/<opcoes>[\s\S]*?<\/opcoes>/gi, '').replace(/\n{3,}/g, '\n\n').trim();
  return { clean, options: allOptions };
}

// ── System prompts por fase ────────────────────────────────────────────────
function buildSystemPrompt(
  phase: Phase,
  projectName: string,
  skills: Record<string, string>,
  extraSkills: SkillEntry[]
): string {
  const extraSkillsBlock = extraSkills.length > 0
    ? extraSkills.map(s => `## SKILL EXTRA ATIVA: ${s.name}\n${s.content}`).join('\n\n---\n\n')
    : '';

  const optionsInstruction = `
## INSTRUÇÃO DE INTERFACE — OPÇÕES INTERATIVAS
Quando for apresentar ao usuário uma lista de opções para escolher (tipo de app, stack, framework, estilo de design, etc.), use SEMPRE este formato especial ao final da pergunta:
<opcoes>Opção A|Opção B|Opção C|Opção D</opcoes>

Exemplo:
"Qual será o principal tipo do seu aplicativo?
<opcoes>Web App (browser)|App Mobile (React Native)|API / Backend|Desktop (Electron)</opcoes>"

Use este formato para QUALQUER pergunta com opções predefinidas, em TODAS as fases.
O usuário verá botões clicáveis para cada opção, com um campo "Outro" para resposta personalizada.
`;

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

${optionsInstruction}

---

${skills['project-planner'] ? `## AGENTE: Project Planner\n${skills['project-planner']}\n\n---\n` : ''}
${extraSkillsBlock ? `${extraSkillsBlock}\n\n---\n` : ''}
`;

  if (phase === 'brainstorm') {
    return base + `## SKILL ATIVA: Brainstorming (Portão Socrático)
${skills['brainstorming'] || ''}

Inicie SEMPRE com o Portão Socrático: faça 3 perguntas investigativas sobre o projeto antes de qualquer coisa.
Não sugira soluções técnicas ainda. Apenas entenda o problema, o público e os objetivos.
Quando apresentar opções de resposta, use o formato <opcoes>...</opcoes>.`;
  }

  if (phase === 'planning') {
    return base + `## SKILL ATIVA: Plan Writing
${skills['plan-writing'] || ''}

Com base no brainstorm, gere o **task.md** — o documento mais importante do projeto.
Este arquivo será lido pelo agente de IA na IDE (Cursor, Claude Code, etc.) como a bíblia de execução.

### REGRAS DO task.md:

1. **Granularidade atômica**: cada checkbox deve ser UMA ação concreta que o agente pode executar sozinho.
2. **Agrupado por fases** usando headers markdown (##).
3. **Ordem de execução**: tasks na ordem que faz sentido implementar.
4. **Cobertura total**: do "npm create" até o deploy.

5. **Header do documento:**
\`\`\`
# NOME DO PROJETO
## Missão
Descrição curta.
## Stack
Tecnologias escolhidas.
---
## Fase 1: ...
- [ ] task 1
\`\`\`

6. **Rodapé:**
\`\`\`
---
> INSTRUÇÃO PARA O AGENTE: Você pode adicionar novas tasks a este arquivo.
> Marque tasks concluídas com "- [x]".
\`\`\`

Escreva o task.md usando <write_file path="task.md">.
Também gere implementation_plan.md com <write_file path="implementation_plan.md">.

NENHUM código ainda. Apenas documentação.`;
  }

  if (phase === 'architecture') {
    return base + `## FASE: Arquitetura e Handoff para IDE

Com base no planejamento aprovado:

1. **Defina o stack tecnológico final** com justificativa breve.

2. **Gere o .cursorrules** com <write_file path=".cursorrules">:
\`\`\`
IMPORTANTE: Leia o arquivo task.md ANTES de começar qualquer implementação.
Siga a ordem das tasks. Marque cada task concluída com "- [x]".
Se surgir uma feature nova, adicione "- [ ]" na fase apropriada do task.md.
\`\`\`

3. **Gere o PRD.md** com <write_file path="PRD.md">.

4. Aguarde aprovação do usuário antes de sinalizar conclusão.

NENHUM código de aplicação. Apenas documentação e regras.`;
  }

  return base;
}

// ── Componente de opções ──────────────────────────────────────────────────
const OptionButtons: React.FC<{
  options: string[];
  onSelect: (option: string) => void;
  disabled: boolean;
}> = ({ options, onSelect, disabled }) => {
  const [showCustom, setShowCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          onClick={() => onSelect(opt)}
          disabled={disabled}
          className="px-3 py-1.5 text-xs rounded-lg border border-saffron-500/30 bg-saffron-500/8 text-saffron-300 hover:bg-saffron-500/20 hover:border-saffron-500/60 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {opt}
        </button>
      ))}
      {/* Botão Outro */}
      {!showCustom ? (
        <button
          onClick={() => setShowCustom(true)}
          disabled={disabled}
          className="px-3 py-1.5 text-xs rounded-lg border border-vyasa-100/15 bg-vyasa-800/40 text-vyasa-100/50 hover:bg-vyasa-800/70 hover:text-white transition-all disabled:opacity-30"
        >
          ✏️ Outro...
        </button>
      ) : (
        <div className="flex gap-2 w-full mt-1">
          <input
            type="text"
            value={customValue}
            onChange={e => setCustomValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && customValue.trim()) {
                onSelect(customValue.trim());
                setShowCustom(false);
                setCustomValue('');
              }
              if (e.key === 'Escape') { setShowCustom(false); setCustomValue(''); }
            }}
            autoFocus
            placeholder="Digite sua resposta personalizada..."
            className="flex-grow bg-vyasa-800/60 border border-saffron-500/30 focus:border-saffron-500/60 rounded-lg px-3 py-1.5 text-xs text-white placeholder-vyasa-100/30 outline-none transition-colors"
          />
          <button
            onClick={() => {
              if (customValue.trim()) { onSelect(customValue.trim()); setShowCustom(false); setCustomValue(''); }
            }}
            className="px-3 py-1.5 text-xs bg-saffron-500/20 border border-saffron-500/40 text-saffron-400 rounded-lg hover:bg-saffron-500/30 transition-all"
          >
            Enviar
          </button>
        </div>
      )}
    </div>
  );
};

// ── Componente principal ───────────────────────────────────────────────────
export const InceptionChat: React.FC<InceptionChatProps> = ({
  projectHandle,
  projectName,
  onFinish,
  inline = false,
}) => {
  const { rootHandle } = useWorkspaceStore();
  const [phase, setPhase] = useState<Phase>('brainstorm');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [skills, setSkills] = useState<Record<string, string>>({});
  const [skillsReady, setSkillsReady] = useState(false);
  const [contextDoc, setContextDoc] = useState('');
  const [showContextForm, setShowContextForm] = useState(false);
  const [filesGenerated, setFilesGenerated] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState<ModelOption | null>(getDefaultModel);

  // Skills dinâmicas
  const [availableSkills, setAvailableSkills] = useState<SkillEntry[]>([]);
  const [activeExtraSkills, setActiveExtraSkills] = useState<Set<string>>(new Set());
  const [showSkillPanel, setShowSkillPanel] = useState(false);

  // chatKey: incrementar dispara nova sessão
  const [chatKey, setChatKey] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const clearChat = () => {
    setMessages([]);
    setFilesGenerated([]);
    setContextDoc('');
    setInput('');
    setChatKey(k => k + 1); // dispara o useEffect de saudação
  };

  // Carrega skills fixas + descobre extras
  useEffect(() => {
    async function load() {
      if (rootHandle) {
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
        const extras = await discoverSkills(rootHandle);
        setAvailableSkills(extras);
      }
      setSkillsReady(true);
    }
    load();
  }, [rootHandle]);

  // Saudação inicial — dispara ao montar e ao reiniciar sessão (chatKey)
  useEffect(() => {
    if (!skillsReady) return;
    const skillsMsg = Object.values(skills).some(s => s)
      ? '⚡ Skills ativas: brainstorming · plan-writing · project-planner'
      : '🔮 Operando sem skills locais — adicione o .agent ao workspace para enriquecer';
    setMessages([{
      id: `welcome-${chatKey}`,
      role: 'system',
      content: `**Sessão Inception — ${projectName}**\n\n${skillsMsg}`,
    }]);
    sendInitialGreeting();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillsReady, chatKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getActiveExtraSkillEntries = (): SkillEntry[] =>
    availableSkills.filter(s => activeExtraSkills.has(s.name));

  const toggleSkill = (name: string) => {
    setActiveExtraSkills(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Escreve arquivo no projeto
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

  const sendInitialGreeting = async () => {
    if (isStreaming) return;
    setIsStreaming(true);
    const systemPrompt = buildSystemPrompt(phase, projectName, skills, getActiveExtraSkillEntries());
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
      }, selectedModel);

      // Extrai opções após completar
      const { clean, options } = extractOptions(fullText);
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: clean, options } : m)
      );
    } catch (err: any) {
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? { ...m, content: `❌ ${err.message}` } : m)
      );
    } finally {
      setIsStreaming(false);
    }
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: text };
    if (!overrideText) setInput('');
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);

    const history: AIMessage[] = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const contextPrefix = contextDoc
      ? `[CONTEXTO EXTERNO]\n${contextDoc}\n\n[MENSAGEM]\n`
      : '';

    history.push({ role: 'user', content: contextPrefix + text });

    const systemPrompt = buildSystemPrompt(phase, projectName, skills, getActiveExtraSkillEntries());
    let fullText = '';
    const assistantId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

    try {
      await streamAI(history, systemPrompt, (chunk) => {
        fullText += chunk;
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: fullText } : m)
        );
      }, selectedModel);

      // Processa file writes
      const writes = parseFileWrites(fullText);
      const written: string[] = [];
      for (const w of writes) {
        const ok = await writeFile(w.path, w.content);
        if (ok) written.push(w.path);
      }

      let displayText = written.length > 0 ? stripFileWrites(fullText) : fullText;

      // Extrai opções
      const { clean, options } = extractOptions(displayText);

      setMessages(prev =>
        prev.map(m => m.id === assistantId
          ? { ...m, content: clean, filesWritten: written.length > 0 ? written : undefined, options }
          : m
        )
      );

      if (written.length > 0) setFilesGenerated(prev => [...new Set([...prev, ...written])]);
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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
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

  // Skills fixas (não aparecem na lista extra)
  const FIXED_SKILLS = new Set(['brainstorming', 'plan-writing', '@project-planner']);
  const extraSkillsList = availableSkills.filter(s => !FIXED_SKILLS.has(s.name));

  return (
    <div className={inline ? "h-full w-full flex bg-vyasa-900/50 overflow-hidden" : "fixed inset-0 z-50 flex bg-vyasa-900"}>

      {/* ── SIDEBAR ── */}
      <div className="w-56 shrink-0 border-r border-saffron-500/15 flex flex-col bg-vyasa-900/80 backdrop-blur-md p-4 overflow-y-auto">
        <div className="mb-6">
          <p className="text-[10px] text-saffron-400/50 tracking-[0.3em] uppercase mb-1">Projeto</p>
          <p className="text-white font-bold text-sm truncate">{projectName}</p>
        </div>

        {/* Fases */}
        <p className="text-[10px] text-vyasa-100/30 tracking-widest uppercase mb-3">Fases</p>
        <div className="space-y-1.5 mb-6">
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

        {/* Skills extras */}
        <div className="mb-4">
          <button
            onClick={() => setShowSkillPanel(!showSkillPanel)}
            className="w-full flex items-center justify-between text-[10px] text-vyasa-100/40 hover:text-saffron-400 tracking-widest uppercase mb-2 transition-colors"
          >
            <span>🧠 Skills extras</span>
            <span className="flex items-center gap-1">
              {activeExtraSkills.size > 0 && (
                <span className="bg-saffron-500/20 text-saffron-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  {activeExtraSkills.size}
                </span>
              )}
              <span className={`transition-transform ${showSkillPanel ? 'rotate-180' : ''}`}>▾</span>
            </span>
          </button>

          {showSkillPanel && (
            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
              {extraSkillsList.length === 0 ? (
                <p className="text-[10px] text-vyasa-100/25 italic px-1">Nenhuma skill extra encontrada no workspace.</p>
              ) : (
                extraSkillsList.map(skill => (
                  <button
                    key={skill.name}
                    onClick={() => toggleSkill(skill.name)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-[11px] transition-all flex items-center gap-2 ${
                      activeExtraSkills.has(skill.name)
                        ? 'bg-saffron-500/15 border border-saffron-500/30 text-saffron-400'
                        : 'text-vyasa-100/40 hover:bg-vyasa-800/50 hover:text-vyasa-100/70 border border-transparent'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeExtraSkills.has(skill.name) ? 'bg-saffron-400' : 'bg-vyasa-100/20'}`} />
                    <span className="truncate">{skill.name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Arquivos gerados */}
        {filesGenerated.length > 0 && (
          <div className="mb-4">
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

        {/* Importar contexto + finalizar */}
        <div className="mt-auto space-y-2">
          <button
            onClick={() => setShowContextForm(!showContextForm)}
            className="w-full text-xs text-vyasa-100/40 hover:text-saffron-400 border border-saffron-500/10 hover:border-saffron-500/30 rounded px-3 py-2 transition-all text-left"
          >
            📜 Pergaminho de Contexto
          </button>

          {phase === 'architecture' && filesGenerated.length > 0 && (
            <button
              onClick={onFinish}
              className="w-full bg-gradient-to-r from-saffron-600 to-saffron-500 text-vyasa-900 font-black text-xs py-3 rounded-lg tracking-widest uppercase hover:opacity-90 transition-all"
            >
              → Voltar ao Cockpit
            </button>
          )}
        </div>
      </div>

      {/* ── ÁREA DE CHAT ── */}
      <div className="flex-grow flex flex-col min-w-0">

        {/* Header */}
        <div className="shrink-0 border-b border-saffron-500/10 bg-vyasa-900/60 backdrop-blur-md">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo-vyasa.png" alt="" className="w-6 h-6 rounded-full object-cover opacity-70" />
              <span className="text-sm text-saffron-400 font-medium">Inception</span>
              <span className="text-[10px] bg-saffron-500/10 border border-saffron-500/15 text-saffron-400/60 px-2 py-0.5 rounded-full">
                {phase}
              </span>
              {activeExtraSkills.size > 0 && (
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                  +{activeExtraSkills.size} skill{activeExtraSkills.size > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={clearChat}
                disabled={isStreaming}
                className="flex items-center gap-1.5 text-[11px] text-vyasa-100/30 hover:text-saffron-400 hover:bg-saffron-500/10 px-2.5 py-1.5 rounded transition-all disabled:opacity-20"
                title="Nova sessão (limpa o histórico)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.17"/></svg>
                ↺ Nova sessão
              </button>
              <button
                onClick={onFinish}
                className="text-xs text-vyasa-100/30 hover:text-vyasa-100/60 transition-colors"
              >
                ← Fechar
              </button>
            </div>
          </div>
          {/* Model Selector Bar */}
          <div className="px-6 py-1.5 border-t border-saffron-500/5 flex items-center gap-3">
            <span className="text-[10px] text-vyasa-100/25">modelo:</span>
            <ModelSelector value={selectedModel} onChange={setSelectedModel} />
            {selectedModel && (
              <span className="text-[10px] text-emerald-400/50">⚡ próxima mensagem</span>
            )}
          </div>
        </div>

        {/* Form de contexto externo */}
        {showContextForm && (
          <div className="shrink-0 px-6 py-3 border-b border-saffron-500/10 bg-vyasa-800/30">
            <p className="text-xs text-vyasa-100/50 mb-2">Cole aqui seu briefing externo, mapa de público-alvo, ID visual, etc:</p>
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
                        .prose th{background:rgba(244,180,26,0.1);color:var(--color-saffron-400);padding:0.4em 0.8em;text-align:left;font-size:0.8em;}
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
                    {/* Botões de opções */}
                    {msg.options && msg.options.length > 0 && (
                      <OptionButtons
                        options={msg.options}
                        onSelect={(opt) => send(opt)}
                        disabled={isStreaming}
                      />
                    )}
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
              onClick={() => send()}
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
