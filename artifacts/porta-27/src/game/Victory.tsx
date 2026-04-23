export function Victory({ onAgain }: { onAgain: () => void }) {
  return (
    <div className="relative z-10 flex flex-col items-center text-center max-w-[600px] px-4">
      <div className="text-ember-bright text-[8px] tracking-[0.4em] mb-2 flicker">VOCE ENCONTROU A SAIDA.</div>
      <h1 className="text-ember-bright text-[80px] sm:text-[120px] text-shadow-ember glow-pulse leading-none mb-4">
        100
      </h1>
      <div className="text-ink text-[11px] mb-8 italic max-w-[400px] leading-relaxed">
        A ultima porta nao tinha numero. So a luz fria do dia.<br />
        Voce nao olha pra tras.
      </div>

      <button
        onClick={onAgain}
        className="text-[12px] px-8 py-3 border-2 border-ember text-ember-bright hover:bg-ember hover:text-bg transition-colors"
      >
        ENTRAR OUTRA VEZ
      </button>
    </div>
  );
}
