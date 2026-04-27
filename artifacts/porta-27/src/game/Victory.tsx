export function Victory({ onAgain }: { onAgain: () => void }) {
  return (
    <div className="relative z-10 flex flex-col items-center text-center max-w-[700px] px-6 py-8">
      <div className="text-ember-bright text-sm-mobile text-xs-desktop tracking-[0.4em] mb-4 flicker font-bold">VOCÊ ENCONTROU A SAÍDA.</div>
      <h1 className="text-ember-bright text-7xl-mobile text-6xl-desktop text-shadow-ember glow-pulse leading-none mb-6">
        100
      </h1>
      <div className="text-ink text-base-mobile text-sm-desktop mb-10 italic max-w-[500px] leading-relaxed">
        A última porta não tinha número. Só a luz fria do dia.<br />
        Você não olha para trás.
      </div>

      <button
        onClick={onAgain}
        className="text-lg-mobile text-base-desktop px-10 py-4 border-3 border-ember text-ember-bright hover:bg-ember hover:text-bg transition-all duration-200 font-bold rounded-lg"
      >
        ENTRAR OUTRA VEZ
      </button>
    </div>
  );
}
