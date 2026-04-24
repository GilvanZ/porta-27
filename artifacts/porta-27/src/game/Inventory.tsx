import { useState } from "react";
import type { Item } from "./types";
import type { AggregatedEffects } from "./generate";
import { canDiscard, rarityColor } from "./items";

export function Inventory({
  items,
  currentDoor,
  visionActive,
  canActivateVision,
  inCombat,
  onUseItem,
  onEquip,
  onDiscard,
  onActivateVision,
}: {
  items: Item[];
  currentDoor: number;
  visionActive: boolean;
  canActivateVision: boolean;
  inCombat: boolean;
  onUseItem: (uid: string) => void;
  onEquip: (uid: string) => void;
  onDiscard: (uid: string) => void;
  onActivateVision: () => void;
  eff?: AggregatedEffects;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="fixed bottom-2 right-2 z-40 max-w-[260px] sm:max-w-[300px] pointer-events-none">
      <div className="pointer-events-auto bg-bg/95 border border-ember/40 backdrop-blur-sm shadow-[0_0_18px_rgba(217,122,42,0.18)]">
        <div className="px-2 py-1 border-b border-ink-dim/40 flex items-center justify-between text-[8px] tracking-[0.3em] text-ember-bright">
          <span>INVENTARIO</span>
          <span className="text-ink-dim">{items.length}</span>
        </div>

        {visionActive && (
          <div className="px-2 py-1 text-[8px] text-rare border-b border-rare/30 animate-pulse">
            ◎ VISAO ATIVA — passe o mouse nas portas
          </div>
        )}

        <div className="p-2 grid grid-cols-5 sm:grid-cols-6 gap-1 max-h-[200px] overflow-y-auto">
          {items.length === 0 && (
            <div className="col-span-full text-[9px] text-ink-dim italic text-center py-3">
              Maos vazias.
            </div>
          )}
          {items.map((it) => {
            const locked = !canDiscard(it, currentDoor) && !it.curse;
            const cursed = it.curse;
            const dur = currentDoor - it.acquiredAtDoor;
            const isOlhoVidro = it.active === "olho_vidro";
            const isUsable = !!it.active;
            return (
              <div
                key={it.uid}
                className="relative group"
                onMouseEnter={() => setHovered(it.uid)}
                onMouseLeave={() => setHovered(null)}
              >
                <button
                  onClick={() => setExpanded(expanded === it.uid ? null : it.uid)}
                  className={`w-full aspect-square flex items-center justify-center border ${
                    it.equipped
                      ? "border-ember bg-ember/10"
                      : cursed
                      ? "border-blood/60"
                      : "border-ink-dim/50"
                  } hover:border-ember-bright transition-colors relative`}
                  style={{ color: rarityColor(it.rarity), filter: `drop-shadow(0 0 3px ${rarityColor(it.rarity)}80)` }}
                >
                  <span className="text-[14px] sm:text-[16px]">{it.glyph}</span>
                  {it.equipped && (
                    <span className="absolute top-[1px] left-[1px] text-[6px] text-ember-bright">E</span>
                  )}
                  {locked && (
                    <span className="absolute bottom-[1px] right-[1px] text-[7px] text-ink-dim">⌂</span>
                  )}
                  {cursed && (
                    <span className="absolute bottom-[1px] left-[1px] text-[7px] text-blood">✝</span>
                  )}
                  {isOlhoVidro && canActivateVision && !visionActive && (
                    <span className="absolute top-[1px] right-[1px] text-[6px] text-rare animate-pulse">●</span>
                  )}
                </button>

                {/* Tooltip */}
                {hovered === it.uid && expanded !== it.uid && (
                  <div className="absolute right-full mr-2 bottom-0 w-[200px] bg-bg border border-ember/60 p-2 text-[9px] text-ink z-50 pointer-events-none shadow-lg">
                    <div className="text-[10px]" style={{ color: rarityColor(it.rarity) }}>
                      {it.name} <span className="text-[7px]">[{it.rarity}]</span>
                    </div>
                    <div className="text-ink-dim italic mt-1 text-[8px]">{it.desc}</div>
                    <div className="mt-1 text-mind-bright text-[8px]">+ {it.upside}</div>
                    {it.downside && <div className="text-blood text-[8px]">- {it.downside}</div>}
                    <div className="mt-1 text-ink-dim text-[7px]">
                      Carregado por {dur} porta{dur !== 1 ? "s" : ""}
                      {locked ? " — falta " + (2 - dur) : ""}
                    </div>
                    {it.slot && (
                      <div className="text-[7px] text-ember-bright mt-[2px]">
                        EQUIPAVEL [{it.slot}{it.armorTier ? " — " + it.armorTier : ""}]{it.equipped ? " — EM USO" : ""}
                      </div>
                    )}
                    {it.curse && (
                      <div className="text-[7px] text-blood mt-[2px]">AMALDICOADO — nao pode ser descartado</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Expanded action panel */}
        {expanded && (() => {
          const it = items.find((x) => x.uid === expanded);
          if (!it) return null;
          const locked = !canDiscard(it, currentDoor);
          const dur = currentDoor - it.acquiredAtDoor;
          const isVisionItem = it.active === "olho_vidro";
          const isConsumable = !!it.active && !isVisionItem && it.active !== "totem_tempo";
          return (
            <div className="border-t border-ember/40 p-2 text-[9px] text-ink">
              <div className="flex items-start gap-2">
                <span style={{ color: rarityColor(it.rarity), filter: `drop-shadow(0 0 3px ${rarityColor(it.rarity)})` }} className="text-[16px]">{it.glyph}</span>
                <div className="flex-1">
                  <div style={{ color: rarityColor(it.rarity) }}>{it.name}</div>
                  <div className="text-ink-dim italic text-[8px]">{it.desc}</div>
                  <div className="mt-[2px] text-mind-bright text-[8px]">+ {it.upside}</div>
                  {it.downside && <div className="text-blood text-[8px]">- {it.downside}</div>}
                  <div className="text-ink-dim text-[7px] mt-1">
                    {dur} porta{dur !== 1 ? "s" : ""} carregando
                  </div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {isVisionItem && canActivateVision && !visionActive && (
                  <button
                    onClick={() => {
                      onActivateVision();
                      setExpanded(null);
                    }}
                    className="text-[8px] px-2 py-1 border border-rare text-rare hover:bg-rare/20"
                  >
                    ATIVAR
                  </button>
                )}
                {isConsumable && (
                  <button
                    onClick={() => {
                      if (it.active === "pocao_vida" || it.active === "pocao_sanidade") {
                        onUseItem(it.uid);
                        setExpanded(null);
                      } else if (inCombat) {
                        onUseItem(it.uid);
                        setExpanded(null);
                      }
                    }}
                    disabled={it.active === "bomba_fumaca" && !inCombat}
                    className="text-[8px] px-2 py-1 border border-ember text-ember hover:bg-ember/20 disabled:border-ink-dim disabled:text-ink-dim"
                  >
                    USAR
                  </button>
                )}
                {it.slot && !it.equipped && (
                  <button
                    onClick={() => {
                      onEquip(it.uid);
                      setExpanded(null);
                    }}
                    className="text-[8px] px-2 py-1 border border-ember-bright text-ember-bright hover:bg-ember/20"
                  >
                    EQUIPAR
                  </button>
                )}
                {it.slot && it.equipped && (
                  <button
                    onClick={() => {
                      onEquip(it.uid);
                      setExpanded(null);
                    }}
                    className="text-[8px] px-2 py-1 border border-ink-dim text-ink hover:bg-ink/20"
                  >
                    DESEQUIPAR
                  </button>
                )}
                <button
                  onClick={() => {
                    if (canDiscard(it, currentDoor)) {
                      onDiscard(it.uid);
                      setExpanded(null);
                    }
                  }}
                  disabled={!canDiscard(it, currentDoor)}
                  className="text-[8px] px-2 py-1 border border-blood text-blood hover:bg-blood/20 disabled:border-ink-dim disabled:text-ink-dim"
                >
                  {it.curse ? "AMALDICOADO" : locked ? `BLOQ (${2 - dur})` : "DESCARTAR"}
                </button>
                <button
                  onClick={() => setExpanded(null)}
                  className="text-[8px] px-2 py-1 text-ink-dim hover:text-ember-bright ml-auto"
                >
                  fechar
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
