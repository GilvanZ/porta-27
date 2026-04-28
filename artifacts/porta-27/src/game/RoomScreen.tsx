import { useEffect, useMemo, useState } from "react";
import type { RoomData, RoomCtx, RoomResolution } from "./rooms";
import type { RoomKind } from "./types";

export function RoomScreen({
  room,
  kind,
  ctx,
  resolved,
  onResolve,
  onContinue,
}: {
  room: RoomData;
  kind: RoomKind;
  ctx: Pick<RoomCtx, "hp" | "sanity" | "gold" | "maxHp" | "maxSanity">;
  resolved: boolean;
  onResolve: (r: RoomResolution) => void;
  onContinue: () => void;
}) {
  const [resultMsg, setResultMsg] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!resolved) setResultMsg(null);
  }, [resolved]);

  const handleClick = (resolveFn: (c: any) => RoomResolution) => {
    const res = resolveFn({ ...ctx } as RoomCtx);
    setResultMsg(res.message);
    if ((res.hpDelta ?? 0) < 0 || (res.sanityDelta ?? 0) < -1) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
    if (res.end !== false) {
      onResolve(res);
    }
  };

  return (
    <div
      className={`relative min-h-full flex flex-col items-center justify-start py-6 px-4 overflow-hidden ${
        shake ? "animate-[shake_0.3s]" : ""
      }`}
    >
      <RoomAmbient kind={kind} />

      <div className={`relative z-10 text-lg-mobile text-base-desktop tracking-[0.25em] sm:tracking-[0.3em] text-shadow-hard text-center font-bold ${room.accent}`}>
        {room.title.toUpperCase()}
      </div>
      <div className="relative z-10 text-sm-mobile text-xs-desktop text-ink-dim mt-3 italic max-w-[700px] text-center px-4 leading-relaxed">
        {room.flavor}
      </div>

      <pre
        className={`relative z-10 mt-3 sm:mt-4 text-[8px] sm:text-[12px] leading-[1.05] ${room.accent} text-shadow-hard overflow-x-auto max-w-full`}
        style={{ filter: "drop-shadow(0 0 6px currentColor)" }}
      >
{room.art}
      </pre>

      {resolved && resultMsg ? (
        <div className="relative z-10 mt-4 flex flex-col items-center gap-3 w-full">
          <div className="text-[11px] text-ink text-center max-w-[500px] px-2">{resultMsg}</div>
          <button
            onClick={onContinue}
            className="text-[11px] px-6 py-3 border-2 border-ember text-ember-bright hover:bg-ember hover:text-bg active:bg-ember active:text-bg transition-colors min-h-[44px]"
          >
            CONTINUAR ►
          </button>
        </div>
      ) : (
        <div className="relative z-10 mt-4 flex flex-col gap-2 items-stretch w-full max-w-[420px]">
          {room.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleClick(opt.resolve)}
              className="text-[10px] px-3 py-3 border border-ink-dim hover:border-ember-bright active:border-ember-bright active:bg-ember/10 text-ink hover:text-ember-bright transition-colors text-left min-h-[44px]"
            >
              {">"} {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RoomAmbient({ kind }: { kind: RoomKind }) {
  const config = useMemo(() => kindConfig(kind), [kind]);

  // Random particle positions, stable per mount of this kind
  const particles = useMemo(() => {
    return Array.from({ length: config.count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 6,
      dur: 4 + Math.random() * 6,
      size: config.minSize + Math.random() * (config.maxSize - config.minSize),
    }));
  }, [config]);

  return (
    <div
      key={kind}
      className="pointer-events-none absolute inset-0 z-0"
      style={{
        background: config.bg,
        animation: "roomFadeIn 600ms ease-out",
      }}
    >
      {/* Vignette tint */}
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, transparent 30%, ${config.tint} 100%)`,
          mixBlendMode: "screen",
          opacity: 0.6,
        }}
      />

      {/* Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: config.particle,
            borderRadius: config.shape === "round" ? "50%" : "0",
            boxShadow: `0 0 ${p.size * 2}px ${config.particle}`,
            opacity: config.particleOpacity,
            animation: `${config.anim} ${p.dur}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}

      {config.flash && (
        <div
          className="absolute inset-0"
          style={{
            background: config.flash,
            animation: "roomFlash 3.4s ease-in-out infinite",
            mixBlendMode: "screen",
          }}
        />
      )}

      {/* Vertical streaks for trap/danger */}
      {config.streaks && (
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-px h-full"
              style={{
                left: `${20 + i * 28}%`,
                background: `linear-gradient(180deg, transparent 0%, ${config.particle} 50%, transparent 100%)`,
                opacity: 0.25,
                animation: `roomStreak ${3 + i}s linear infinite`,
                animationDelay: `${i * 0.6}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface KindCfg {
  bg: string;
  tint: string;
  particle: string;
  particleOpacity: number;
  anim: string;
  count: number;
  minSize: number;
  maxSize: number;
  shape: "round" | "square";
  flash?: string;
  streaks?: boolean;
}

function kindConfig(kind: RoomKind): KindCfg {
  switch (kind) {
    case "enemy":
      return {
        bg: "radial-gradient(ellipse at center, rgba(60,8,8,0.35) 0%, rgba(7,8,12,0) 70%)",
        tint: "rgba(139,26,26,0.18)",
        particle: "#8b1a1a",
        particleOpacity: 0.45,
        anim: "roomPulse",
        count: 18,
        minSize: 1,
        maxSize: 3,
        shape: "round",
        flash: "radial-gradient(circle at 50% 40%, rgba(139,26,26,0.18) 0%, transparent 60%)",
      };
    case "boss":
      return {
        bg: "radial-gradient(ellipse at center, rgba(80,10,10,0.55) 0%, rgba(7,8,12,0) 75%)",
        tint: "rgba(139,26,26,0.28)",
        particle: "#d97a2a",
        particleOpacity: 0.55,
        anim: "roomFloat",
        count: 28,
        minSize: 2,
        maxSize: 5,
        shape: "round",
        flash: "radial-gradient(circle at 50% 50%, rgba(217,122,42,0.22) 0%, transparent 65%)",
        streaks: true,
      };
    case "trap":
      return {
        bg: "linear-gradient(180deg, rgba(7,8,12,0) 0%, rgba(40,8,12,0.35) 100%)",
        tint: "rgba(139,26,26,0.12)",
        particle: "#c9c4b0",
        particleOpacity: 0.35,
        anim: "roomFall",
        count: 24,
        minSize: 1,
        maxSize: 2,
        shape: "square",
        streaks: true,
      };
    case "chest":
      return {
        bg: "radial-gradient(ellipse at 50% 60%, rgba(230,195,74,0.18) 0%, rgba(7,8,12,0) 70%)",
        tint: "rgba(230,195,74,0.20)",
        particle: "#e6c34a",
        particleOpacity: 0.6,
        anim: "roomFloat",
        count: 22,
        minSize: 1,
        maxSize: 3,
        shape: "round",
      };
    case "puzzle":
      return {
        bg: "radial-gradient(ellipse at center, rgba(91,140,181,0.18) 0%, rgba(7,8,12,0) 70%)",
        tint: "rgba(91,140,181,0.22)",
        particle: "#9bd1ff",
        particleOpacity: 0.4,
        anim: "roomDrift",
        count: 16,
        minSize: 1,
        maxSize: 2,
        shape: "square",
      };
    case "npc":
      return {
        bg: "radial-gradient(ellipse at center, rgba(108,102,87,0.20) 0%, rgba(7,8,12,0) 70%)",
        tint: "rgba(201,196,176,0.10)",
        particle: "#c9c4b0",
        particleOpacity: 0.3,
        anim: "roomDrift",
        count: 14,
        minSize: 1,
        maxSize: 3,
        shape: "round",
      };
    case "shop":
      return {
        bg: "radial-gradient(ellipse at 50% 65%, rgba(217,122,42,0.18) 0%, rgba(7,8,12,0) 75%)",
        tint: "rgba(230,195,74,0.14)",
        particle: "#f5b25c",
        particleOpacity: 0.55,
        anim: "roomFloat",
        count: 18,
        minSize: 1,
        maxSize: 3,
        shape: "round",
      };
    case "shrine":
      return {
        bg: "radial-gradient(ellipse at 50% 50%, rgba(155,209,255,0.16) 0%, rgba(7,8,12,0) 70%)",
        tint: "rgba(184,127,201,0.18)",
        particle: "#b87fc9",
        particleOpacity: 0.55,
        anim: "roomFloat",
        count: 26,
        minSize: 1,
        maxSize: 3,
        shape: "round",
        flash: "radial-gradient(circle at 50% 50%, rgba(155,209,255,0.20) 0%, transparent 60%)",
      };
    case "rare":
      return {
        bg: "radial-gradient(ellipse at center, rgba(184,127,201,0.22) 0%, rgba(7,8,12,0) 75%)",
        tint: "rgba(184,127,201,0.25)",
        particle: "#b87fc9",
        particleOpacity: 0.65,
        anim: "roomFloat",
        count: 32,
        minSize: 1,
        maxSize: 4,
        shape: "round",
        flash: "radial-gradient(circle at 50% 50%, rgba(184,127,201,0.25) 0%, transparent 60%)",
        streaks: true,
      };
    case "shortcut":
      return {
        bg: "linear-gradient(180deg, rgba(7,8,12,0) 0%, rgba(217,122,42,0.18) 100%)",
        tint: "rgba(217,122,42,0.18)",
        particle: "#f5b25c",
        particleOpacity: 0.5,
        anim: "roomDash",
        count: 18,
        minSize: 1,
        maxSize: 2,
        shape: "square",
        streaks: true,
      };
    case "empty":
    default:
      return {
        bg: "radial-gradient(ellipse at center, rgba(20,22,30,0.4) 0%, rgba(7,8,12,0) 70%)",
        tint: "rgba(108,102,87,0.10)",
        particle: "#6c6657",
        particleOpacity: 0.25,
        anim: "roomDrift",
        count: 12,
        minSize: 1,
        maxSize: 2,
        shape: "round",
      };
  }
}
