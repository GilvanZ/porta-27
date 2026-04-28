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
    <div className="relative z-10 flex flex-col items-center justify-center text-center max-w-[900px] px-6 min-h-[85vh]">
      <div className="text-ember-bright text-shadow-ember flicker text-sm-mobile text-xs-desktop tracking-[0.4em] mb-6">
        UM CORREDOR. CEM PORTAS.
      </div>
      <h1 className="text-ember text-shadow-ember text-4xl-mobile text-3xl-desktop leading-none mb-3 glow-pulse" style={{ color: "#ffd700" }}>
        PORTA
      </h1>
      <h1 className="text-ember-bright text-shadow-ember text-6xl-mobile text-5xl-desktop leading-none mb-10 glow-pulse">
        27
      </h1>

      <div className="text-ink-dim text-base-mobile text-sm-desktop leading-relaxed mb-12 max-w-[600px] px-4">
        Você não deveria estar aqui.<br />
        Chegue até a Porta 100. Se conseguir.
      </div>

      <button
        onClick={onStart}
        className="text-lg-mobile text-base-desktop px-10 py-5 border-3 border-ember text-ember-bright hover:bg-ember hover:text-bg transition-all duration-200 pixel-corners font-bold"
      >
        ABRIR A PRIMEIRA PORTA
      </button>

      <div className="text-sm-mobile text-xs-desktop text-ink-dim mt-8 opacity-70">
        Created by: <a href="https://www.instagram.com/z44ck.g/?hl=en" className="underline hover:text-ember">z44ck.g</a>
      </div>
    </div>
  );
}
