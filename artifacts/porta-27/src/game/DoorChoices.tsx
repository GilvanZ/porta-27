import { useEffect, useState } from "react";
import type { Door } from "./types";
import type { AggregatedEffects } from "./generate";
import { trueKindReadable } from "./generate";
import { sfx } from "./audio";

export function DoorChoices({
  doors,
  onChoose,
  eff,
  visionActive,
}: {
  doors: Door[];
  onChoose: (d: Door) => void;
  eff: AggregatedEffects;
  visionActive?: boolean;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    setRevealed(false);
    const t = setTimeout(() => setRevealed(true), 250);
    return () => clearTimeout(t);
  }, [doors]);

  return (
    <div className="h-full flex flex-col items-center justify-start px-4 py-2">
      <div className="text-sm-mobile text-sm-desktop text-ink-dim mb-3 flicker tracking-[0.25em] font-bold">
        {visionActive ? <span className="text-rare">◎ OLHO DE VIDRO REVELANDO ◎</span> : "TRÊS PORTAS NO CORREDOR"}
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full max-w-[1000px]">
        {doors.map((d, i) => (
          <DoorCard
            key={d.id}
            door={d}
            index={i}
            revealed={revealed}
            isHovered={hovered === d.id}
            visionActive={!!visionActive}
            onHover={(h) => {
              if (h) sfx.hover();
              setHovered(h ? d.id : null);
            }}
            onClick={() => onChoose(d)}
          />
        ))}
      </div>

      <div className="mt-6 text-[8px] text-ink-dim flex gap-4 flex-wrap justify-center max-w-[700px]">
        {eff.hintClarity > 0 && (
          <span className="text-mind-bright">[+{eff.hintClarity} clareza]</span>
        )}
        {eff.visionBonus && <span className="text-rare">[visao revela 1 porta]</span>}
        {eff.mapBonus && <span className="text-mind">[mapa parcial]</span>}
        {eff.skipChance > 0 && (
          <span className="text-ember">[chance de atalho +{Math.round(eff.skipChance * 100)}%]</span>
        )}
      </div>
    </div>
  );
}

function DoorCard({
  door,
  index,
  revealed,
  isHovered,
  visionActive,
  onHover,
  onClick,
}: {
  door: Door;
  index: number;
  revealed: boolean;
  isHovered: boolean;
  visionActive: boolean;
  onHover: (h: boolean) => void;
  onClick: () => void;
}) {
  const isShortcut = door.skipAmount > 1;
  const showTrue = visionActive && isHovered;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      style={{
        transitionDelay: `${index * 80}ms`,
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(12px)",
      }}
      className={`group relative flex min-h-[130px] flex-col justify-between items-center bg-bg-soft ${
        isHovered ? "" : ""
      } px-2 py-2 sm:px-3 sm:py-4 transition-all duration-300 hover:bg-fog active:bg-fog active:border-ember`}
    >
      {/* Door pixel art */}
      <div
        className={`relative ${isHovered ? "glow-pulse" : ""}`}
        style={{ color: isHovered ? "#f5b25c" : "#6c6657" }}
      >
        <DoorArt spriteType={door.spriteType} highlight={isHovered} shortcut={isShortcut} />
      </div>

      <div className={`mt-2 text-xl-mobile text-lg-desktop ${isHovered ? "text-ember-bright text-shadow-ember" : "text-ink"} font-bold text-center`}>
        {String(door.doorNumber).padStart(3, "0")}
      </div>

      {isShortcut && (
        <div className="text-[10px] sm:text-xs text-ember mt-1 font-bold text-center">
          ► PULA {door.skipAmount} PORTAS
          {door.shortcutCost ? ` (-${door.shortcutCost} VIDA)` : ""}
        </div>
      )}

      {showTrue && (
        <div className="absolute top-2 left-1/2 z-20 w-[calc(100%-1rem)] -translate-x-1/2 rounded-full bg-black/80 text-[9px] sm:text-[11px] text-rare tracking-[0.35em] px-2 py-1 animate-pulse font-bold">
          {trueKindReadable(door.trueKind).toUpperCase()}
        </div>
      )}

      <div className="mt-2 flex flex-col gap-1 items-center min-h-[36px] w-full">
        {door.hints.slice(0, 2).map((h, i) => (
          <div
            key={i}
            className="w-full text-[10px] sm:text-[11px] tracking-[0.15em] px-2 py-1 text-center font-bold"
            style={{
              color: hintColor(h),
              textShadow: `0 0 6px ${hintColor(h)}40`,
            }}
          >
            {h}
          </div>
        ))}
      </div>

      <div className="mt-4 text-sm-mobile text-xs-desktop text-ink-dim opacity-0 group-hover:opacity-100 transition-opacity font-bold">
        [ABRIR]
      </div>
    </button>
  );
}

function hintColor(h: string) {
  switch (h) {
    case "PERIGO ALTO":
      return "#d97a2a";
    case "TESOURO":
      return "#e6c34a";
    case "PRESENCA VIVA":
      return "#9bd1ff";
    case "EVENTO ESTRANHO":
      return "#b87fc9";
    case "SALA SEGURA":
    case "LUZ DISTANTE":
      return "#9bd1ff";
    case "FRIO INTENSO":
      return "#5b8cb5";
    case "SONS METALICOS":
    case "CHEIRO DE FERRO":
      return "#c9c4b0";
    case "SILENCIO ABSOLUTO":
    case "MURMURIOS":
      return "#6c6657";
    default:
      return "#6c6657";
  }
}

function DoorArt({ spriteType, highlight, shortcut }: { spriteType: 0 | 1 | 2; highlight: boolean; shortcut: boolean }) {
  const spriteUrl = `/door${spriteType}.png`;
  
  return (
    <div
      className="w-[80px] h-[110px] sm:w-[120px] sm:h-[160px] relative overflow-hidden"
      style={{
        backgroundImage: `url('${spriteUrl}')`,
        backgroundSize: "100% 400%",
        backgroundPosition: "0 0",
        backgroundRepeat: "no-repeat",
        imageRendering: "pixelated",
        border: highlight ? "2px solid #f5b25c" : "2px solid #3a3528",
        animation: "doorFrames 0.8s steps(4, start) infinite",
      }}
    >
      {/* Glow effect */}
      {highlight && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            boxShadow: "inset 0 0 8px rgba(245, 178, 92, 0.3), 0 0 12px rgba(245, 178, 92, 0.4)",
            pointerEvents: "none",
          }}
        />
      )}
      
      {/* Shortcut indicator */}
      {shortcut && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: "20px",
            color: highlight ? "#f5b25c" : "#d97a2a",
            fontWeight: "bold",
            textShadow: "0 0 4px rgba(0,0,0,0.8)",
            pointerEvents: "none",
          }}
        >
          ➔
        </div>
      )}
    </div>
  );
}
