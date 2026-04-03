import React, { useState } from 'react';
import { useFileSystem } from '../../hooks/useFileSystem';
import { InceptionChat } from '../inception/InceptionChat';

interface WizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const NewProjectWizard: React.FC<WizardProps> = ({ onClose, onSuccess }) => {
  const { saveWorkspaceHandle } = useFileSystem();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [inceptionHandle, setInceptionHandle] = useState<any>(null);
  const [pendingParentHandle, setPendingParentHandle] = useState<any>(null);
  const [projectSlug, setProjectSlug] = useState('');

  const [projectName, setProjectName] = useState('');
  const [techStack, setTechStack] = useState<'web' | 'mobile' | 'backend' | 'agent' | 'cloner'>('web');
  const [briefing, setBriefing] = useState('');

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const generateCursorRules = (stack: string) => {
    let rules = `You are an expert AI Developer inside the Vyasa Sync ecosystem.\n\n`;
    rules += `IMPORTANTE: Leia o arquivo task.md ANTES de começar qualquer implementação.\n`;
    rules += `Ele contém o checklist completo do projeto. Siga a ordem das tasks.\n`;
    rules += `Marque cada task concluída com "- [x]" no task.md.\n`;
    rules += `Se surgir uma feature nova durante a implementação, adicione um novo\n`;
    rules += `"- [ ]" na fase apropriada do task.md antes de implementar.\n\n`;
    if (stack === 'web') {
      rules += `[WEB DEVELOPMENT RULES]\n- Use React 18 / Next.js.\n- Use Tailwind CSS v4.\n- Implement responsive, mobile-first design.\n- Ensure high aesthetic quality.\n`;
    } else if (stack === 'mobile') {
      rules += `[MOBILE DEVELOPMENT RULES]\n- Use Expo / React Native.\n- Follow iOS and Android UX guidelines strictly.\n- Optimize performance and touch zones.\n`;
    } else if (stack === 'backend') {
      rules += `[BACKEND RULES]\n- Node.js / Python architectures.\n- Prioritize security, validation, and RESTful/GraphQL scalability.\n- Abstract database layers (Prisma / Drizzle).\n`;
    } else if (stack === 'agent') {
      rules += `[AI AGENT RULES]\n- Build Langchain / OpenAI based intelligent nodes.\n- Follow strictly Antigravity Kit protocols.\n- Save memories and knowledge in local Markdown format.\n`;
    } else if (stack === 'cloner') {
      rules += `[HIGH-FIDELITY CLONING WORKFLOW]
You are a pixel-perfect Website Reverse-Engineering Agent.
DO NOT hallucinate new UI paradigms; you are an exact replicator for manufacturing landing pages.

Phase 1: Visual Audit
- Capture Design Tokens (Colors, Typography, Spacing, Border Radius, Shadows).
- Identify Breakpoints and Interaction states.

Phase 2: Component Inventory
- Deconstruct structure, variants, and states (hover, active).
- Analyze responsive behavior.

Phase 3: Layout Architecture
- Map Grid system, Flexbox, max-widths, and z-index layers.

Phase 4: Execution
- Replicate using standard Shadcn/Tailwind (or current stack).
- Ensure pixel-perfect emulation first; customize later.
`;
    }
    return rules;
  };

  const generatePlanMarkdown = () => {
    return `# ${projectName.toUpperCase()}

## Missão
${briefing || 'Preencha o direcionamento inicial aqui.'}

## Stack
A definir no Inception Chat.

---

## Fase 1: Fundação do Sistema
- [ ] Definir stack e inicializar projeto
- [ ] Configurar estrutura de pastas
- [ ] Instalar dependências base

## Fase 2: Regras de Negócio Básicas
- [ ] A detalhar no Inception Chat (Fase 2: Planejamento)

## Fase 3: Polimento UX
- [ ] A detalhar no Inception Chat (Fase 2: Planejamento)

---

> INSTRUÇÃO PARA O AGENTE: Você pode adicionar novas tasks a este arquivo.
> Se durante a implementação surgir uma necessidade não prevista, adicione
> um novo "- [ ]" na fase apropriada ou crie uma nova fase.
> Marque tasks concluídas com "- [x]".
`;
  };

  // "Criar Pasta" — abre picker para escolher onde criar, cria a subpasta lá
  const handleCriarPasta = async () => {
    if (!projectName.trim()) return setError('Nome do projeto é obrigatório.');
    setLoading(true);
    setError('');

    try {
      // Usuário escolhe onde criar a pasta
      const parentHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      const slug = projectName.trim().toLowerCase().replace(/ /g, '-');

      // Cria a subpasta com o nome do projeto
      const projectFolder = await parentHandle.getDirectoryHandle(slug, { create: true });

      // Escreve .cursorrules
      const rulesHandle = await projectFolder.getFileHandle('.cursorrules', { create: true });
      const rulesWritable = await rulesHandle.createWritable();
      await rulesWritable.write(generateCursorRules(techStack));
      await rulesWritable.close();

      // Escreve task.md
      const planHandle = await projectFolder.getFileHandle('task.md', { create: true });
      const planWritable = await planHandle.createWritable();
      await planWritable.write(generatePlanMarkdown());
      await planWritable.close();

      // Guarda o parent para salvar como workspace só depois que inception terminar
      setPendingParentHandle(parentHandle);
      setProjectSlug(slug);
      setLoading(false);
      setInceptionHandle(projectFolder);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Falha ao criar a pasta.');
      }
      setLoading(false);
    }
  };

  const handleInceptionFinish = async () => {
    // Salva o workspace (pasta pai) agora que tudo foi criado
    if (pendingParentHandle) {
      await saveWorkspaceHandle(pendingParentHandle);
    }
    onSuccess();
    onClose();
  };

  if (inceptionHandle) {
    return (
      <InceptionChat
        projectHandle={inceptionHandle}
        projectName={projectSlug}
        onFinish={handleInceptionFinish}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-vyasa-900/90 backdrop-blur-sm p-4">
      <div className="glass-panel-vedic border border-saffron-500/50 p-8 w-full max-w-2xl text-left relative overflow-hidden shadow-[0_0_50px_rgba(244,180,26,0.15)]">

        <div className="absolute top-0 right-0 w-64 h-64 bg-saffron-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="flex justify-between items-center mb-8 relative z-10 border-b border-saffron-500/20 pb-4">
          <h2 className="text-3xl font-sans font-bold tracking-widest text-saffron-400 uppercase">
            Novo Projeto
          </h2>
          <button onClick={onClose} className="text-vyasa-100 hover:text-white" disabled={loading}>✕</button>
        </div>

        {error && <div className="mb-4 text-red-400 bg-red-400/10 p-3 text-sm rounded">{error}</div>}

        {/* STEP 1: Nome */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 relative z-10">
            <h3 className="text-lg text-white mb-2 font-bold uppercase tracking-wider">1. Nome do Projeto</h3>
            <p className="text-sm text-vyasa-100/60 mb-6">Como este projeto será chamado?</p>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && projectName.trim() && nextStep()}
              placeholder="ex: app-calorias, wedosites-fast..."
              className="w-full bg-vyasa-900/50 border border-saffron-500/30 rounded p-4 text-white focus:outline-none focus:border-saffron-500 mb-8 font-mono tracking-wider shadow-inner"
              autoFocus
            />
            <div className="flex justify-end">
              <button
                onClick={nextStep}
                disabled={!projectName.trim()}
                className="bg-saffron-500 text-vyasa-900 font-bold px-8 py-3 rounded opacity-90 hover:opacity-100 disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider text-sm transition-all"
              >
                Próximo
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Vocação */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 relative z-10">
            <h3 className="text-lg text-white mb-2">2. Vocação do Repositório</h3>
            <p className="text-sm text-vyasa-100/60 mb-6">Gera um <code>.cursorrules</code> otimizado para blindar o repositório contra alucinações.</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {(['web', 'mobile', 'backend', 'agent', 'cloner'] as const).map(stack => (
                <button
                  key={stack}
                  onClick={() => setTechStack(stack)}
                  className={`p-4 rounded border text-left transition-all ${
                    techStack === stack
                      ? 'border-saffron-500 bg-saffron-500/10 shadow-[0_0_15px_rgba(244,180,26,0.3)]'
                      : 'border-vyasa-700 bg-vyasa-800/50 hover:border-saffron-500/50 text-vyasa-100/70'
                  }`}
                >
                  <strong className="block text-white uppercase tracking-wider text-sm mb-1">
                    {stack === 'agent' ? 'AI Agent' : stack === 'cloner' ? 'UI Cloner ✧' : stack}
                  </strong>
                  <span className="text-xs opacity-70">
                    {stack === 'cloner' ? 'Agente replicador pixel-perfect para Landing Pages.' : 'Regras nativas para esta plataforma.'}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button onClick={prevStep} className="text-vyasa-100 uppercase tracking-wider text-sm hover:text-white">◀ Voltar</button>
              <button onClick={nextStep} className="bg-saffron-500 text-vyasa-900 font-bold px-8 py-3 rounded uppercase tracking-wider text-sm hover:opacity-90">Próximo</button>
            </div>
          </div>
        )}

        {/* STEP 3: Briefing + Criar Pasta */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 relative z-10">
            <h3 className="text-lg text-white mb-2">3. O que é este projeto?</h3>
            <p className="text-sm text-vyasa-100/60 mb-6">Descreva brevemente. Vira o <code>task.md</code> que os agentes usam como bíblia.</p>
            <textarea
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              placeholder="Ex: Painel de controle financeiro em Next.js com gráficos e autenticação..."
              className="w-full h-32 bg-vyasa-900/50 border border-saffron-500/30 rounded p-4 text-vyasa-100 text-sm focus:outline-none focus:border-saffron-500 mb-8 font-sans leading-relaxed resize-none shadow-inner"
            />
            <div className="flex justify-between items-center">
              <button disabled={loading} onClick={prevStep} className="text-vyasa-100 uppercase tracking-wider text-sm hover:text-white">◀ Voltar</button>
              <button
                onClick={handleCriarPasta}
                disabled={loading}
                className="bg-gradient-to-r from-saffron-600 to-saffron-500 text-vyasa-900 font-bold px-10 py-4 rounded uppercase tracking-widest text-sm hover:shadow-[0_0_20px_rgba(244,180,26,0.6)] transition-all flex items-center gap-2"
              >
                {loading ? (
                  <><span className="w-4 h-4 rounded-full border-2 border-vyasa-900 border-t-transparent animate-spin" /> Criando...</>
                ) : (
                  '📁 Criar Pasta'
                )}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
