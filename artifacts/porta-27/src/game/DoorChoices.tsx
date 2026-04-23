import { useEffect, useState } from "react";
import type { Door } from "./types";
import type { AggregatedEffects } from "./generate";
import { sfx } from "./audio";

export function DoorChoices({
  doors,
  onChoose,
  eff,
}: {
  doors: Door[];
  onChoose: (d: Door) => void;
  eff: AggregatedEffects;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    setRevealed(false);
    setScanned(false);
    const t = setTimeout(() => setRevealed(true), 250);
    return () => clearTimeout(t);
  }, [doors]);

  const onScan = () => {
    if (scanned) return;
    sfx.hover();
    setScanned(true);
  };

  return (
    <div className="h-full flex flex-col items-center justify-center">
      <div className="text-[10px] text-ink-dim mb-4 flicker tracking-[0.3em]">
        TRES PORTAS NO CORREDOR
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-[900px]">
        {doors.map((d, i) => (
          <DoorCard
            key={d.id}
            door={d}
            index={i}
            revealed={revealed}
            scanned={scanned}
            isHovered={hovered === d.id}
            onHover={(h) => {
              if (h) sfx.hover();
              setHovered(h ? d.id : null);
            }}
            onClick={() => onChoose(d)}
          />
        ))}
      </div>

      {eff.hasActiveScan && (
        <button
          onClick={onScan}
          disabled={scanned}
          className={`mt-4 text-[9px] px-4 py-2 border-2 ${
            scanned
              ? "border-rare/40 text-rare/50"
              : "border-rare text-rare hover:bg-rare/20 active:bg-rare/30"
          } transition-colors min-h-[36px]`}
        >
          {scanned ? "OLHO USADO ✦" : "✦ USAR OLHO DE VIDRO (revela tipos)"}
        </button>
      )}

      <div className="mt-6 text-[8px] text-ink-dim flex gap-4 flex-wrap justify-center max-w-[700px]">
        {eff.hintClarity > 0 && (
          <span className="text-mind-bright">[+{eff.hintClarity} clareza]</span>
        )}
        {eff.mapBonus && <span className="text-mind">[mapa parcial]</span>}
        {eff.skipChance > 0 && (
          <span className="text-ember">[chance de atalho +{Math.round(eff.skipChance * 100)}%]</span>
        )}
        {eff.hasRevive && <span className="text-rare">[totem ativo]</span>}
      </div>
    </div>
  );
}

function DoorCard({
  door,
  index,
  revealed,
  scanned,
  isHovered,
  onHover,
  onClick,
}: {
  door: Door;
  index: number;
  revealed: boolean;
  scanned: boolean;
  isHovered: boolean;
  onHover: (h: boolean) => void;
  onClick: () => void;
}) {
  const isShortcut = door.skipAmount > 1;
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
      className={`group relative flex flex-col items-center bg-bg-soft border-2 ${
        isHovered ? "border-ember" : "border-ink-dim/50"
      } px-3 py-4 sm:px-4 sm:py-6 transition-all duration-300 hover:bg-fog active:bg-fog active:border-ember min-h-[140px]`}
    >
      {/* Door pixel art */}
      <div
        className={`relative ${isHovered ? "glow-pulse" : ""}`}
        style={{ color: isHovered ? "#f5b25c" : "#6c6657" }}
      >
        <DoorArt number={door.doorNumber} highlight={isHovered} shortcut={isShortcut} />
      </div>

      <div className={`mt-3 text-[24px] ${isHovered ? "text-ember-bright text-shadow-ember" : "text-ink"}`}>
        {String(door.doorNumber).padStart(3, "0")}
      </div>

      {isShortcut && (
        <div className="text-[8px] text-ember mt-1">
          ► PULA {door.skipAmount} PORTAS
          {door.shortcutCost ? ` (-${door.shortcutCost} VIDA)` : ""}
        </div>
      )}

      {scanned && (
        <div
          className="mt-1 text-[8px] px-2 py-[2px] border border-rare/60 text-rare tracking-widest"
          style={{ textShadow: "0 0 4px #b87fc955" }}
        >
          ✦ {kindLabel(door.trueKind)}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-1 items-center min-h-[40px]">
        {door.hints.map((h, i) => (
          <div
            key={i}
            className="text-[9px] text-ink-dim tracking-widest border border-ink-dim/30 px-2 py-[2px]"
            style={{
              color: hintColor(h),
              borderColor: hintColor(h) + "55",
              textShadow: `0 0 4px ${hintColor(h)}30`,
            }}
          >
            {h}
          </div>
        ))}
      </div>

      <div className="mt-3 text-[8px] text-ink-dim opacity-0 group-hover:opacity-100 transition-opacity">
        [abrir]
      </div>
    </button>
  );
}

function kindLabel(k: string) {
  switch (k) {
    case "empty": return "VAZIA";
    case "enemy": return "INIMIGO";
    case "trap": return "ARMADILHA";
    case "treasure": return "TESOURO";
    case "event": return "EVENTO";
    case "shop": return "MERCADOR";
    case "rest": return "DESCANSO";
    case "rare": return "RARO";
    case "boss": return "CHEFE";
    default: return k.toUpperCase();
  }
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

function DoorArt({ number, highlight, shortcut }: { number: number; highlight: boolean; shortcut: boolean }) {
  // Procedural variant by number
  const variant = number % 4;
  const handleSide = number % 2 === 0 ? "right" : "left";
  return (
    <svg viewBox="0 0 60 80" className="w-[80px] h-[110px] sm:w-[120px] sm:h-[160px]" style={{ imageRendering: "pixelated" }}>
      {/* Frame */}
      <rect x="2" y="2" width="56" height="76" fill="#0d1018" stroke={highlight ? "#f5b25c" : "#3a3528"} strokeWidth="1" />
      <rect x="6" y="6" width="48" height="68" fill={shortcut ? "#1a0f08" : "#1a1308"} stroke={highlight ? "#d97a2a" : "#2a2418"} strokeWidth="1" />

      {/* Wood planks */}
      <line x1="20" y1="6" x2="20" y2="74" stroke="#0a0805" strokeWidth="1" />
      <line x1="40" y1="6" x2="40" y2="74" stroke="#0a0805" strokeWidth="1" />

      {/* Variant decoration */}
      {variant === 0 && (
        <>
          <rect x="12" y="14" width="36" height="2" fill="#0a0805" />
          <rect x="12" y="64" width="36" height="2" fill="#0a0805" />
        </>
      )}
      {variant === 1 && (
        <>
          <rect x="12" y="20" width="36" height="20" fill="#0a0805" opacity="0.4" />
          <rect x="14" y="22" width="32" height="16" fill="none" stroke="#3a2a18" />
        </>
      )}
      {variant === 2 && (
        <>
          <circle cx="30" cy="24" r="6" fill="#0a0805" opacity="0.5" />
          <circle cx="30" cy="24" r="3" fill={highlight ? "#f5b25c" : "#3a2a18"} />
        </>
      )}
      {variant === 3 && (
        <>
          <polygon points="30,14 46,30 30,46 14,30" fill="none" stroke="#3a2a18" />
        </>
      )}

      {/* Number plate */}
      <rect x="20" y="48" width="20" height="10" fill="#2a1a08" stroke={highlight ? "#f5b25c" : "#3a2a18"} />
      <text x="30" y="55" fontSize="6" fill={highlight ? "#f5b25c" : "#8a7a4a"} textAnchor="middle" fontFamily="monospace">
        {String(number).padStart(2, "0")}
      </text>

      {/* Handle */}
      <circle
        cx={handleSide === "right" ? 50 : 10}
        cy="42"
        r="1.5"
        fill={highlight ? "#f5b25c" : "#8a7a4a"}
      />

      {/* Light leak from under */}
      {highlight && (
        <rect x="6" y="73" width="48" height="2" fill="#f5b25c" opacity="0.6">
          <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.6s" repeatCount="indefinite" />
        </rect>
      )}

      {/* Shortcut arrows */}
      {shortcut && (
        <g fill={highlight ? "#f5b25c" : "#d97a2a"}>
          <polygon points="14,38 22,38 22,34 30,42 22,50 22,46 14,46" opacity="0.7" />
          <polygon points="32,38 40,38 40,34 48,42 40,50 40,46 32,46" opacity="0.7" />
        </g>
      )}
    </svg>
  );
}
