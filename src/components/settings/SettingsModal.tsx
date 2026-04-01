import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

interface SettingsModalProps {
  onClose: () => void;
}

const LS_KEYS = {
  OPENAI: 'vyasa_key_openai',
  ANTHROPIC: 'vyasa_key_anthropic',
  OPENROUTER: 'vyasa_key_openrouter',
};

type Tab = 'keys' | 'profile';

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { user, profile, fetchProfile } = useAuthStore();
  const [tab, setTab] = useState<Tab>('keys');

  // API Keys — salvas apenas no localStorage (nunca sobem ao servidor)
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [keysSaved, setKeysSaved] = useState(false);

  // Profile — salvo no Supabase (sem dados sensíveis)
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  useEffect(() => {
    setOpenaiKey(localStorage.getItem(LS_KEYS.OPENAI) || '');
    setAnthropicKey(localStorage.getItem(LS_KEYS.ANTHROPIC) || '');
    setOpenrouterKey(localStorage.getItem(LS_KEYS.OPENROUTER) || '');
  }, []);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setCompany(profile.company || '');
    }
  }, [profile]);

  const saveKeys = () => {
    localStorage.setItem(LS_KEYS.OPENAI, openaiKey.trim());
    localStorage.setItem(LS_KEYS.ANTHROPIC, anthropicKey.trim());
    localStorage.setItem(LS_KEYS.OPENROUTER, openrouterKey.trim());
    setKeysSaved(true);
    setTimeout(() => setKeysSaved(false), 2500);
  };

  const saveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    setProfileError('');
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email,
      full_name: fullName.trim(),
      company: company.trim(),
    });
    setProfileSaving(false);
    if (error) {
      setProfileError(error.message);
    } else {
      setProfileSaved(true);
      fetchProfile();
      setTimeout(() => setProfileSaved(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-vyasa-900/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg glass-panel-vedic p-0 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-saffron-500/15">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-saffron-400"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
            <h3 className="text-base font-serif text-white tracking-wide">Configurações Globais</h3>
          </div>
          <button
            onClick={onClose}
            className="text-vyasa-100/30 hover:text-vyasa-100/70 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-saffron-500/10">
          <button
            onClick={() => setTab('keys')}
            className={`flex-1 py-3 text-xs font-semibold tracking-widest uppercase transition-all duration-200 ${
              tab === 'keys'
                ? 'text-saffron-400 border-b-2 border-saffron-500'
                : 'text-vyasa-100/40 hover:text-vyasa-100/60'
            }`}
          >
            API Keys
          </button>
          <button
            onClick={() => setTab('profile')}
            className={`flex-1 py-3 text-xs font-semibold tracking-widest uppercase transition-all duration-200 ${
              tab === 'profile'
                ? 'text-saffron-400 border-b-2 border-saffron-500'
                : 'text-vyasa-100/40 hover:text-vyasa-100/60'
            }`}
          >
            Perfil
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* ── TAB: API KEYS ── */}
          {tab === 'keys' && (
            <>
              <div className="bg-vyasa-800/40 border border-saffron-500/10 rounded-lg px-4 py-3 text-[11px] text-vyasa-100/40 leading-relaxed">
                <span className="text-saffron-400/70">Segurança:</span> Todas as chaves são salvas exclusivamente no{' '}
                <code className="text-saffron-500/60">localStorage</code> do seu navegador.
                Nunca são transmitidas ou armazenadas na nuvem.
              </div>

              <KeyField
                label="OpenAI API Key"
                placeholder="sk-proj-..."
                value={openaiKey}
                onChange={setOpenaiKey}
                hint="Usada para GPT-4o e embeddings"
              />
              <KeyField
                label="Anthropic API Key"
                placeholder="sk-ant-..."
                value={anthropicKey}
                onChange={setAnthropicKey}
                hint="Usada para Claude Opus / Sonnet"
              />
              <KeyField
                label="OpenRouter API Key"
                placeholder="sk-or-v1-..."
                value={openrouterKey}
                onChange={setOpenrouterKey}
                hint="Acesso unificado a múltiplos modelos"
              />

              <button
                onClick={saveKeys}
                className="w-full bg-gradient-to-r from-saffron-600 to-saffron-500 text-vyasa-900 font-bold py-3 rounded-lg tracking-widest text-sm uppercase hover:opacity-90 transition-all"
              >
                {keysSaved ? '✓ Salvo com sucesso' : 'Salvar Chaves Localmente'}
              </button>
            </>
          )}

          {/* ── TAB: PERFIL ── */}
          {tab === 'profile' && (
            <>
              <div>
                <label className="block text-xs text-vyasa-100/50 tracking-widest uppercase mb-1.5">E-mail</label>
                <input
                  type="text"
                  value={user?.email || ''}
                  disabled
                  className="w-full bg-vyasa-800/30 border border-saffron-500/10 rounded-lg px-4 py-3 text-sm text-vyasa-100/40 outline-none cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs text-vyasa-100/50 tracking-widest uppercase mb-1.5">Nome completo</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full bg-vyasa-800/60 border border-saffron-500/20 focus:border-saffron-500/60 rounded-lg px-4 py-3 text-sm text-white placeholder-vyasa-100/30 outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-vyasa-100/50 tracking-widest uppercase mb-1.5">Empresa / Studio</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Nome da empresa ou projeto"
                  className="w-full bg-vyasa-800/60 border border-saffron-500/20 focus:border-saffron-500/60 rounded-lg px-4 py-3 text-sm text-white placeholder-vyasa-100/30 outline-none transition-colors"
                />
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-vyasa-800/30 border border-saffron-500/10">
                <div>
                  <p className="text-xs text-vyasa-100/50 uppercase tracking-widest">Plano atual</p>
                  <p className="text-white font-semibold capitalize mt-0.5">
                    {profile?.plan === 'pro' ? (
                      <span className="text-saffron-400">Pro</span>
                    ) : (
                      'Gratuito'
                    )}
                  </p>
                </div>
                {profile?.plan !== 'pro' && (
                  <span className="ml-auto text-[10px] bg-saffron-500/10 border border-saffron-500/30 text-saffron-400 px-3 py-1.5 rounded-full tracking-widest uppercase">
                    Em breve: Upgrade
                  </span>
                )}
              </div>

              {profileError && (
                <p className="text-red-400 text-xs">{profileError}</p>
              )}

              <button
                onClick={saveProfile}
                disabled={profileSaving}
                className="w-full bg-gradient-to-r from-saffron-600 to-saffron-500 text-vyasa-900 font-bold py-3 rounded-lg tracking-widest text-sm uppercase hover:opacity-90 transition-all disabled:opacity-50"
              >
                {profileSaving ? 'Salvando...' : profileSaved ? '✓ Perfil atualizado' : 'Salvar Perfil'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function KeyField({
  label,
  placeholder,
  value,
  onChange,
  hint,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  hint: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label className="block text-xs text-vyasa-100/50 tracking-widest uppercase mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-vyasa-800/60 border border-saffron-500/20 focus:border-saffron-500/60 rounded-lg px-4 py-2.5 pr-10 text-sm text-white placeholder-vyasa-100/20 outline-none transition-colors font-mono"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-vyasa-100/30 hover:text-vyasa-100/60 transition-colors"
        >
          {show ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          )}
        </button>
      </div>
      <p className="text-[10px] text-vyasa-100/30 mt-1 ml-1">{hint}</p>
    </div>
  );
}
