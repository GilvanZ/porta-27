import { useEffect, useState } from "react";

export function Title({
  bestRun,
  totalRuns,
  onStart,
}: {
  bestRun: number;
  totalRuns: number;
  onStart: () => void;
}) {
  const [showHint, setShowHint] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowHint(true), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-[700px] px-4 min-h-[80vh]">
      <div className="text-ember-bright text-shadow-ember flicker text-[10px] tracking-[0.4em] mb-4">
        UM CORREDOR. CEM PORTAS.
      </div>
      <h1 className="text-ember text-shadow-ember text-[40px] sm:text-[56px] leading-none mb-2 glow-pulse" style={{ color: "#f5b25c" }}>
        PORTA
      </h1>
      <h1 className="text-ember-bright text-shadow-ember text-[80px] sm:text-[120px] leading-none mb-8 glow-pulse">
        27
      </h1>

      <div className="text-ink-dim text-[10px] leading-loose mb-10 max-w-[500px]">
        Voce nao deveria estar aqui.<br />
        Cada porta esconde algo. Talvez tesouro. Talvez nao.<br />
        Chegue ate a Porta 100. Se conseguir.
      </div>

      <button
        onClick={onStart}
        className="text-[14px] px-8 py-4 border-2 border-ember text-ember-bright hover:bg-ember hover:text-bg transition-colors text-shadow-hard pixel-corners"
      >
        ABRIR A PRIMEIRA PORTA
      </button>

      {showHint && (
        <div className="text-[8px] text-ink-dim mt-6 opacity-60 flicker">
          [clique para entrar - som recomendado]
        </div>
      )}

      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-8 text-[8px] text-ink-dim">
        <div>MELHOR: <span className="text-ember">PORTA {bestRun}</span></div>
        <div>TENTATIVAS: <span className="text-ember">{totalRuns}</span></div>
      </div>
    </div>
  );
}
