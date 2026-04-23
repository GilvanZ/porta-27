import type { RunState } from "./types";

export function HUD({
  state,
  onMute,
  muted,
  onInventory,
}: {
  state: RunState;
  onMute: () => void;
  muted: boolean;
  onInventory: () => void;
}) {
  return (
    <div className="flex flex-col gap-2 text-[10px] text-ink">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <Bar
            label="VIDA"
            value={state.hp}
            max={state.maxHp}
            color="#8b1a1a"
            glow="#d97a2a"
          />
          <Bar
            label="SANIDADE"
            value={state.sanity}
            max={state.maxSanity}
            color="#5b8cb5"
            glow="#9bd1ff"
          />
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 flex-wrap">
          <div className="text-ember-bright text-shadow-hard text-[11px]">
            ◐ {state.gold}
          </div>
          <div className="text-ink-dim text-[10px]">
            PORTA <span className="text-ember-bright text-shadow-ember">{state.doorNumber}</span>
            <span className="text-ink-dim">/100</span>
          </div>
          <button
            onClick={onInventory}
            className="px-2 py-2 sm:py-1 border border-ink-dim text-ink active:bg-ember/20 hover:border-ember hover:text-ember-bright transition-colors text-[9px] min-h-[32px]"
          >
            INV ({state.items.length})
          </button>
          <button
            onClick={onMute}
            className="px-2 py-2 sm:py-1 border border-ink-dim text-ink-dim active:bg-ember/20 hover:text-ember-bright hover:border-ember transition-colors text-[9px] min-h-[32px]"
          >
            {muted ? "[MUDO]" : "[SOM]"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Bar({
  label,
  value,
  max,
  color,
  glow,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  glow: string;
}) {
  const cells = max;
  // On mobile, use smaller cells so up to ~14 cells fit in tight space
  return (
    <div className="flex items-center gap-2">
      <div className="text-[9px] text-ink-dim w-[52px] sm:w-[60px] shrink-0">{label}</div>
      <div
        className="flex gap-[2px] items-center flex-1 sm:flex-none"
        style={{ filter: `drop-shadow(0 0 4px ${glow}40)` }}
      >
        {Array.from({ length: cells }).map((_, i) => {
          const filled = i < value;
          return (
            <div
              key={i}
              className="h-3 sm:h-[14px] flex-1 sm:flex-none"
              style={{
                maxWidth: 12,
                minWidth: 4,
                width: 8,
                background: filled ? color : "#1a1d28",
                border: `1px solid ${filled ? glow : "#2a2d38"}`,
              }}
            />
          );
        })}
      </div>
      <div className="text-[9px] text-ink w-[36px] shrink-0 text-right">
        {value}/{max}
      </div>
    </div>
  );
}
