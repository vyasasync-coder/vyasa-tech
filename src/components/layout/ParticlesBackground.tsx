import React, { useMemo } from 'react';

export const ParticlesBackground: React.FC = () => {
  // Gera partículas aleatórias em posições e velocidades diferentes
  const particles = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      size: Math.random() * 3 + 1,
      left: Math.random() * 100,
      animDuration: Math.random() * 30 + 15, // 15s to 45s
      animDelay: Math.random() * 15,
      opacity: Math.random() * 0.5 + 0.1,
    }));
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden bg-vyasa-900 pointer-events-none">
      <style>{`
        @keyframes float-up {
          0% { transform: translateY(110vh) translateX(0); opacity: 0; }
          10% { opacity: var(--max-opacity); }
          90% { opacity: var(--max-opacity); }
          100% { transform: translateY(-10vh) translateX(20px); opacity: 0; }
        }
      `}</style>

      {/* Deep blue background base */}
      <div className="absolute inset-0 bg-gradient-to-b from-vyasa-900 via-vyasa-800 to-vyasa-900"></div>

      {/* Floating Particles (Vedic Cosmology stars style) */}
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute bg-saffron-500 rounded-full shadow-[0_0_10px_rgba(244,180,26,0.8)]"
          style={{
            width: p.size + 'px',
            height: p.size + 'px',
            left: p.left + '%',
            opacity: 0,
            animation: 'float-up ' + p.animDuration + 's linear infinite',
            animationDelay: p.animDelay + 's',
            ['--max-opacity' as any]: p.opacity
          }}
        />
      ))}
      
      {/* Central elegant glow */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-sky-900/10 rounded-full blur-[120px]"></div>
    </div>
  );
};
