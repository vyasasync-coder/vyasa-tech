import React from 'react';

function App() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Image of Vyasadeva and Narada Muni */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-1000"
        style={{ backgroundImage: "url('/bg-vyasa.png')" }}
      >
        {/* Blue Filter overlay covering the background with transparency */}
        <div className="absolute inset-0 bg-vyasa-900/80 backdrop-blur-[2px]"></div>
      </div>

      <div className="relative z-10 py-10 px-10 flex flex-col min-h-screen max-w-7xl mx-auto">
        <header className="mb-14 pb-8 border-b border-saffron-500/30 flex items-center gap-6">
          <img src="/logo-vyasa.png" alt="Vyasa Sync Logo" className="w-24 h-24 rounded-full border-2 border-saffron-400 shadow-[0_0_20px_rgba(244,180,26,0.6)] object-cover" />
          <div>
            <h1 className="text-5xl font-bold tracking-widest text-saffron-400 uppercase drop-shadow-[0_0_15px_rgba(246,196,70,0.6)]">
              Vyasa Sync
            </h1>
            <p className="mt-3 text-vyasa-100 text-lg font-light tracking-wide italic opacity-90">
              O Cockpit da Orquestração • O Cérebro Compartilhado
            </p>
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 flex-grow">
          <div className="glass-panel-vedic p-10 min-h-[400px] flex flex-col justify-center items-center text-center transition-transform hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(244,180,26,0.2)] duration-300 group">
            
            {/* Inner mystical gold glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-saffron-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

            <div className="relative z-10 w-20 h-20 rounded-full border border-saffron-400 bg-vyasa-900/50 flex justify-center items-center mb-8 shadow-[0_0_20px_rgba(246,196,70,0.4)] group-hover:scale-110 transition-transform duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-saffron-400"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 20v-2a2 2 0 0 0-2-2v-4a2 2 0 0 0-2-2H4"/></svg>
            </div>
            
            <h2 className="relative z-10 text-3xl font-serif text-white mb-4 tracking-wide">Conectar Workspace</h2>
            <p className="relative z-10 text-sm text-vyasa-100 opacity-90 mb-10 leading-relaxed font-light">
              Acesse a API nativa do sistema para indexar projetos, prover o conhecimento e cadenciar inteligências locais.
            </p>
            
            <button className="relative z-10 bg-gradient-to-r from-saffron-600 to-saffron-500 text-vyasa-900 font-bold py-4 px-10 rounded-sm opacity-90 hover:opacity-100 transition-all glow-saffron cursor-pointer tracking-widest text-sm uppercase">
              Injetar Bússola
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
