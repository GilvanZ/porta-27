import type { RunState } from "./types"; 
import { Coin } from "../components/ui/coin";

export function HUD({
  state,
}: {
  state: RunState;
}) {
  return (
    <div className="flex flex-col gap-3 text-base-mobile text-sm-desktop text-ink px-4 py-3 bg-bg-soft/90 backdrop-blur-sm border border-fog rounded-lg">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
          <Bar
            label="VIDA"
            value={state.hp}
            max={state.maxHp}
            color="#ff4444"
            glow="#ff8c42"
          />
          <Bar
            label="SANIDADE "
            value={state.sanity}
            max={state.maxSanity}
            color="#4a9eff"
            glow="#87ceff"
          />
        </div>
        <div className="flex items-center justify-between lg:justify-end gap-4 lg:gap-6 flex-wrap">
          <div className="text-ember-bright text-shadow-hard text-lg-mobile text-base-desktop font-bold">
            <Coin /> {state.gold}
          </div>
          <div className="text-ink-dim text-base-mobile text-sm-desktop">
            PORTA <span className="text-ember-bright text-shadow-ember font-bold text-lg-mobile text-base-desktop">{state.doorNumber}</span>
            <span className="text-ink-dim">/100</span>
          </div>
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
  return (
    <div className="flex items-center gap-3">
      <div className="text-sm-mobile text-xs-desktop text-ink-dim w-[70px] sm:w-[80px] shrink-0 font-bold">{label}</div>
      <div
        className="flex gap-[3px] items-center flex-1 sm:flex-none"
        style={{ filter: `drop-shadow(0 0 6px ${glow}60)` }}
      >
        {Array.from({ length: cells }).map((_, i) => {
          const filled = i < value;
          return (
            <div
              key={i}
              className="h-4 sm:h-5 flex-1 sm:flex-none rounded-sm"
              style={{
                maxWidth: 16,
                minWidth: 6,
                width: 12,
                background: filled ? color : "#2a2d38",
                border: `2px solid ${filled ? glow : "#404040"}`,
                boxShadow: filled ? `0 0 8px ${glow}40` : 'none',
              }}
            />
          );
        })}
      </div>
      <div className="text-sm-mobile text-xs-desktop text-ink w-[50px] shrink-0 text-right font-bold">
        {value}/{max}
      </div>
    </div>
  );
}
