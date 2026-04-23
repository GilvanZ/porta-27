import { useEffect, useState } from "react";
import type { RoomData, RoomCtx, RoomResolution } from "./rooms";

export function RoomScreen({
  room,
  ctx,
  resolved,
  onResolve,
  onContinue,
}: {
  room: RoomData;
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
    <div className={`h-full flex flex-col items-center justify-start py-2 ${shake ? "animate-[shake_0.3s]" : ""}`}>
      <div className={`text-[14px] tracking-[0.3em] text-shadow-hard ${room.accent}`}>
        {room.title.toUpperCase()}
      </div>
      <div className="text-[9px] text-ink-dim mt-1 italic max-w-[600px] text-center">
        {room.flavor}
      </div>

      <pre className={`mt-4 text-[12px] leading-[1.05] ${room.accent} text-shadow-hard`} style={{ filter: "drop-shadow(0 0 6px currentColor)" }}>
{room.art}
      </pre>

      {resolved && resultMsg ? (
        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="text-[11px] text-ink text-center max-w-[500px]">{resultMsg}</div>
          <button
            onClick={onContinue}
            className="text-[11px] px-6 py-2 border-2 border-ember text-ember-bright hover:bg-ember hover:text-bg transition-colors"
          >
            CONTINUAR ►
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2 items-stretch w-full max-w-[400px]">
          {room.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => handleClick(opt.resolve)}
              className="text-[10px] px-3 py-2 border border-ink-dim hover:border-ember-bright text-ink hover:text-ember-bright transition-colors text-left"
            >
              {">"} {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
