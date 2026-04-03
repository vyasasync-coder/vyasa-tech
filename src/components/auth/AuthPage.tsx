import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { ParticlesBackground } from '../layout/ParticlesBackground';

type AuthMode = 'login' | 'register' | 'forgot';

const FEATURES = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
    ),
    title: 'Orquestração Multi-Agente',
    desc: 'Coordene VS Code, Cline, Windsurf e Cursor a partir de um único cockpit.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    ),
    title: 'File System Nativo',
    desc: 'Leitura e escrita direta no seu HD via File System API. Zero upload de código.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 0 0 4.93 19.07"/><path d="M4.93 4.93A10 10 0 0 0 19.07 19.07"/></svg>
    ),
    title: 'Rules Engine',
    desc: 'Gere e versione .cursorrules otimizados por vocação: Web, Mobile, Backend, UI Cloner.',
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
    ),
    title: 'Knowledge Base',
    desc: 'Biblioteca de skills e contextos que alimentam cada agente com inteligência persistente.',
  },
];

const STATS = [
  { value: '4x', label: 'Produtividade média reportada' },
  { value: '100%', label: 'Código permanece local' },
  { value: '∞', label: 'Projetos simultâneos' },
];

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { signIn, signUp, resetPassword, isLoading, error, setError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg('');

    if (mode === 'forgot') {
      const ok = await resetPassword(email);
      if (ok) {
        setSuccessMsg('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
      }
    } else if (mode === 'login') {
      await signIn(email, password);
    } else {
      const ok = await signUp(email, password, fullName);
      if (ok) {
        setSuccessMsg('Conta criada! Verifique seu e-mail para confirmar o cadastro.');
      }
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMsg('');
  };

  return (
    <div className="relative min-h-screen flex overflow-hidden bg-vyasa-900">
      <ParticlesBackground />

      {/* Radial glow decorativo */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-saffron-500/5 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-saffron-600/5 blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-vyasa-700/20 blur-[150px]" />
      </div>

      {/* SPLIT LAYOUT */}
      <div className="relative z-10 flex w-full min-h-screen">

        {/* ── LADO ESQUERDO: BRAND MANIFESTO ── */}
        <div className="hidden lg:flex flex-col justify-center w-[55%] p-8 xl:p-12 overflow-y-auto no-scrollbar">
          <div className="max-w-2xl w-full mx-auto flex flex-col justify-center gap-8 h-full py-4">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <img
              src="/logo-vyasa.png"
              alt="Vyasa Sync"
              className="w-10 h-10 rounded-full shadow-[0_0_20px_rgba(244,180,26,0.3)] object-cover"
            />
            <div>
              <h1 className="text-xl font-bold tracking-[0.3em] text-saffron-400 uppercase">
                Vyasa Sync
              </h1>
              <p className="text-[9px] tracking-[0.2em] text-vyasa-100/40 uppercase">
                AI Cockpit · Architecture Layer
              </p>
            </div>
          </div>

          {/* Headline central */}
          <div className="space-y-6">
            <div>
              <p className="text-saffron-400/60 text-xs tracking-[0.3em] uppercase mb-3">
                O Cockpit da Nova Era
              </p>
              <h2 className="text-4xl xl:text-5xl font-serif text-white leading-tight">
                Arquitetura de
                <br />
                <span className="text-saffron-400">Software</span>
                <br />
                com IA.
              </h2>
              <p className="mt-4 text-vyasa-100/60 text-base leading-relaxed max-w-lg">
                Orquestre múltiplos agentes de IA a partir de um único ponto de comando.
                Seus projetos respiram no seu disco. Sua inteligência vive na nuvem.
              </p>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 max-w-2xl">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="flex items-start gap-3 p-3 rounded-lg bg-vyasa-800/40 border border-saffron-500/10 hover:border-saffron-500/30 transition-colors duration-300"
                >
                  <div className="mt-0.5 text-saffron-400 shrink-0">{f.icon}</div>
                  <div>
                    <p className="text-white text-sm font-semibold tracking-wide">{f.title}</p>
                    <p className="text-vyasa-100/50 text-[11px] mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats rodapé */}
          <div className="flex items-center gap-8 mt-2">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-serif text-saffron-400">{s.value}</p>
                <p className="text-[10px] text-vyasa-100/40 tracking-wide mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
        {/* Fim do max-w-2xl wrapper */}
        </div>

        {/* ── DIVISOR ── */}
        <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-saffron-500/20 to-transparent my-16" />

        {/* ── LADO DIREITO: FORMULÁRIO ── */}
        <div className="flex flex-col justify-center w-full lg:w-[45%] p-8 sm:p-12">

          {/* Logo mobile */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <img src="/logo-vyasa.png" alt="Vyasa Sync" className="w-10 h-10 rounded-full object-cover shadow-[0_0_15px_rgba(244,180,26,0.2)]" />
            <h1 className="text-xl font-bold tracking-widest text-saffron-400 uppercase">Vyasa Sync</h1>
          </div>

          <div className="max-w-[340px] w-full mx-auto">
            {/* Tabs Login / Cadastro */}
            <div className="flex rounded-lg overflow-hidden border border-saffron-500/20 mb-8 bg-vyasa-800/30">
              <button
                onClick={() => switchMode('login')}
                className={`flex-1 py-2.5 text-sm font-semibold tracking-widest uppercase transition-all duration-200 ${
                  mode === 'login'
                    ? 'bg-saffron-500 text-vyasa-900'
                    : 'text-vyasa-100/50 hover:text-vyasa-100/80'
                }`}
              >
                Entrar
              </button>
              <button
                onClick={() => switchMode('register')}
                className={`flex-1 py-2.5 text-sm font-semibold tracking-widest uppercase transition-all duration-200 ${
                  mode === 'register'
                    ? 'bg-saffron-500 text-vyasa-900'
                    : 'text-vyasa-100/50 hover:text-vyasa-100/80'
                }`}
              >
                Cadastrar
              </button>
            </div>

            {/* Headline do form */}
            <div className="mb-8">
              <h3 className="text-2xl font-serif text-white">
                {mode === 'login' ? 'Bem-vindo de volta.' : mode === 'register' ? 'Crie sua conta.' : 'Recuperar senha.'}
              </h3>
              <p className="text-vyasa-100/50 text-sm mt-1">
                {mode === 'login'
                  ? 'Entre para acessar seu cockpit de arquitetura.'
                  : mode === 'register'
                  ? 'Configure seu workspace em segundos. Grátis para sempre.'
                  : 'Enviaremos um link de redefinição para seu e-mail.'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div>
                  <label className="block text-xs text-vyasa-100/50 tracking-widest uppercase mb-1.5">
                    Nome completo
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Seu nome"
                    className="w-full bg-vyasa-800/60 border border-saffron-500/20 focus:border-saffron-500/60 rounded-lg px-4 py-3 text-sm text-white placeholder-vyasa-100/30 outline-none transition-colors duration-200"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-vyasa-100/50 tracking-widest uppercase mb-1.5">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="w-full bg-vyasa-800/60 border border-saffron-500/20 focus:border-saffron-500/60 rounded-lg px-4 py-3 text-sm text-white placeholder-vyasa-100/30 outline-none transition-colors duration-200"
                />
              </div>

              {mode !== 'forgot' && (
                <div>
                  <label className="block text-xs text-vyasa-100/50 tracking-widest uppercase mb-1.5">
                    Senha
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder={mode === 'register' ? 'Mín. 8 caracteres' : '••••••••'}
                    minLength={mode === 'register' ? 8 : undefined}
                    className="w-full bg-vyasa-800/60 border border-saffron-500/20 focus:border-saffron-500/60 rounded-lg px-4 py-3 text-sm text-white placeholder-vyasa-100/30 outline-none transition-colors duration-200"
                  />
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-xs leading-relaxed">
                  {error}
                </div>
              )}

              {successMsg && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-4 py-3 text-emerald-400 text-xs leading-relaxed">
                  {successMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 bg-gradient-to-r from-saffron-600 to-saffron-500 text-vyasa-900 font-bold py-3.5 rounded-lg tracking-widest text-sm uppercase glow-saffron hover:opacity-90 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading
                  ? 'Aguarde...'
                  : mode === 'login'
                  ? 'Entrar no Cockpit'
                  : mode === 'register'
                  ? 'Criar Conta Gratuita'
                  : 'Enviar Link de Recuperação'}
              </button>
            </form>

            {/* Link esqueci a senha / voltar pro login */}
            <div className="text-center mt-4">
              {mode === 'login' && (
                <button
                  onClick={() => switchMode('forgot')}
                  className="text-xs text-saffron-400/50 hover:text-saffron-400 transition-colors underline underline-offset-2"
                >
                  Esqueci minha senha
                </button>
              )}
              {mode === 'forgot' && (
                <button
                  onClick={() => switchMode('login')}
                  className="text-xs text-saffron-400/50 hover:text-saffron-400 transition-colors underline underline-offset-2"
                >
                  ← Voltar para login
                </button>
              )}
            </div>

            {/* Nota de privacidade */}
            <p className="text-center text-[11px] text-vyasa-100/30 mt-6 leading-relaxed">
              Ao continuar, você concorda que nunca armazenamos seu código-fonte.
              <br />
              Apenas metadados de perfil são salvos na nuvem.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
