import type { RoomKind } from "./types";

export function Corridor({
  doorNumber,
  mapPreview,
}: {
  doorNumber: number;
  mapPreview: RoomKind[] | null;
}) {
  const milestones = [10, 25, 50, 75, 100];
  const pct = Math.min(100, (doorNumber / 100) * 100);

  return (
    <div className="mt-3 space-y-1">
      <div className="relative h-3 bg-bg-soft border border-ink-dim/40">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-ember/60 to-ember-bright"
          style={{ width: `${pct}%`, boxShadow: "0 0 8px #d97a2a" }}
        />
        {milestones.map((m) => (
          <div
            key={m}
            className="absolute top-0 h-full w-[2px] bg-ink-dim/60"
            style={{ left: `${m}%` }}
          >
            <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[8px] text-ink-dim">
              {m}
            </div>
          </div>
        ))}
      </div>

      {mapPreview && (
        <div className="flex gap-1 mt-3 text-[8px] text-ink-dim">
          <div className="text-ink-dim">[MAPA]</div>
          {mapPreview.map((k, i) => (
            <div key={i} className="px-1 border border-ink-dim/30 text-ember-bright/70">
              {kindGlyph(k)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function kindGlyph(k: RoomKind) {
  switch (k) {
    case "enemy":
      return "▼";
    case "trap":
      return "✚";
    case "chest":
      return "◆";
    case "puzzle":
      return "?";
    case "npc":
      return "•";
    case "shop":
      return "$";
    case "shrine":
      return "✦";
    case "boss":
      return "▓";
    case "rare":
      return "◉";
    case "shortcut":
      return "►";
    default:
      return "·";
  }
}
