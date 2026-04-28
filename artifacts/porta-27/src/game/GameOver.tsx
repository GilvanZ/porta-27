export function GameOver({
  doorReached,
  cause,
  onRetry,
  bestRun,
}: {
  doorReached: number;
  cause: string;
  onRetry: () => void;
  bestRun: number;
}) 

    

    {
  return (
    <div className="relative z-10 flex flex-col items-center text-center max-w-[700px] px-6 py-16">
      <div className="text-blood text-sm-mobile text-xs-desktop tracking-[0.4em] mb-4 flicker font-bold">VOCÊ NÃO PASSOU.</div>
      <h1 className="text-blood text-5xl-mobile text-4xl-desktop text-shadow-hard mb-4 glow-pulse" style={{ color: "#ff4444" }}>
        FIM
      </h1>
      <div className="text-ink-dim text-base-mobile text-sm-desktop mb-8 italic leading-relaxed">{cause}</div>

      <div className="text-xl-mobile text-lg-desktop text-ember-bright text-shadow-ember mb-2 font-bold">
        PORTA {doorReached}
      </div>
      <div className="text-sm-mobile text-xs-desktop text-ink-dim mb-10 font-bold">MELHOR: PORTA {bestRun}</div>

      <button
        onClick={onRetry}
        className="text-lg-mobile text-base-desktop px-10 py-4 border-3 border-ember text-ember-bright hover:bg-ember hover:text-bg transition-all duration-200 font-bold rounded-lg"
      >
        TENTAR DE NOVO
      </button>

      <div className="text-sm-mobile text-xs-desktop text-ink-dim mt-8 opacity-70">
        o corredor reembaralha.
      </div>
    </div>
  );
}
