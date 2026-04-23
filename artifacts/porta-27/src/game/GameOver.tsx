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
}) {
  return (
    <div className="relative z-10 flex flex-col items-center text-center max-w-[600px] px-4">
      <div className="text-blood text-[8px] tracking-[0.4em] mb-2 flicker">VOCE NAO PASSOU.</div>
      <h1 className="text-blood text-[40px] sm:text-[64px] text-shadow-hard mb-2 glow-pulse" style={{ color: "#8b1a1a" }}>
        FIM
      </h1>
      <div className="text-ink-dim text-[10px] mb-6 italic">{cause}</div>

      <div className="text-[14px] text-ember-bright text-shadow-ember mb-1">
        PORTA {doorReached}
      </div>
      <div className="text-[8px] text-ink-dim mb-8">MELHOR: PORTA {bestRun}</div>

      <button
        onClick={onRetry}
        className="text-[12px] px-8 py-3 border-2 border-ember text-ember-bright hover:bg-ember hover:text-bg transition-colors"
      >
        TENTAR DE NOVO
      </button>

      <div className="text-[8px] text-ink-dim mt-6 opacity-60">
        o corredor reembaralha.
      </div>
    </div>
  );
}
