import { useMemo, useState } from "react";
import type { Item } from "./types";
import type { AggregatedEffects } from "./generate";
import {
  ALL_ITEMS_TEMPLATES,
  RARITY_RANK,
  canDiscard,
  itemAppearanceChance,
  rarityColor,
} from "./items";

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
  const [almanacOpen, setAlmanacOpen] = useState(false);

  const ownedIds = useMemo(() => items.map((i) => i.id), [items]);
  const ownedById = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const it of items) {
      const arr = m.get(it.id) ?? [];
      arr.push(it);
      m.set(it.id, arr);
    }
    return m;
  }, [items]);

  const chances = useMemo(
    () => itemAppearanceChance(currentDoor, ownedIds),
    [currentDoor, ownedIds]
  );

  // Almanac sorted: owned first (worst→best), then unowned (worst→best).
  const almanacRows = useMemo(() => {
    const rows = ALL_ITEMS_TEMPLATES.map((t) => ({
      template: t,
      owned: ownedById.has(t.id),
      ownedCount: ownedById.get(t.id)?.length ?? 0,
      chance: chances[t.id] ?? 0,
    }));
    rows.sort((a, b) => {
      if (a.owned !== b.owned) return a.owned ? -1 : 1;
      const r = RARITY_RANK[a.template.rarity] - RARITY_RANK[b.template.rarity];
      if (r !== 0) return r;
      return a.template.name.localeCompare(b.template.name);
    });
    return rows;
  }, [ownedById, chances]);

  return (
    <div className="fixed bottom-2 right-2 z-40 max-w-[260px] sm:max-w-[300px] pointer-events-none">
      <div className="pointer-events-auto bg-bg/95 border border-ember/40 backdrop-blur-sm shadow-[0_0_18px_rgba(217,122,42,0.18)]">
        <button
          onClick={() => {
            setAlmanacOpen((v) => !v);
            setExpanded(null);
          }}
          className="w-full px-2 py-1 border-b border-ink-dim/40 flex items-center justify-between text-[8px] tracking-[0.3em] text-ember-bright hover:bg-ember/10 transition-colors"
        >
          <span>{almanacOpen ? "ALMANAQUE ▾" : "INVENTARIO ▸"}</span>
          <span className="text-ink-dim">
            {almanacOpen
              ? `${ownedIds.length}/${ALL_ITEMS_TEMPLATES.length}`
              : items.length}
          </span>
        </button>

        {visionActive && (
          <div className="px-2 py-1 text-[8px] text-rare border-b border-rare/30 animate-pulse">
            ◎ VISAO ATIVA — passe o mouse nas portas
          </div>
        )}

        {almanacOpen ? (
          <AlmanacList
            rows={almanacRows}
            currentDoor={currentDoor}
            ownedById={ownedById}
            canActivateVision={canActivateVision}
            visionActive={visionActive}
            expanded={expanded}
            setExpanded={setExpanded}
            hovered={hovered}
            setHovered={setHovered}
          />
        ) : (
          <OwnedGrid
            items={items}
            currentDoor={currentDoor}
            canActivateVision={canActivateVision}
            visionActive={visionActive}
            expanded={expanded}
            setExpanded={setExpanded}
            hovered={hovered}
            setHovered={setHovered}
          />
        )}

        {expanded && (() => {
          const it = items.find((x) => x.uid === expanded);
          if (!it) return null;
          return (
            <ActionPanel
              item={it}
              currentDoor={currentDoor}
              inCombat={inCombat}
              canActivateVision={canActivateVision}
              visionActive={visionActive}
              onUseItem={onUseItem}
              onEquip={onEquip}
              onDiscard={onDiscard}
              onActivateVision={onActivateVision}
              onClose={() => setExpanded(null)}
            />
          );
        })()}
      </div>
    </div>
  );
}

function OwnedGrid({
  items,
  currentDoor,
  canActivateVision,
  visionActive,
  expanded,
  setExpanded,
  hovered,
  setHovered,
}: {
  items: Item[];
  currentDoor: number;
  canActivateVision: boolean;
  visionActive: boolean;
  expanded: string | null;
  setExpanded: (s: string | null) => void;
  hovered: string | null;
  setHovered: (s: string | null) => void;
}) {
  return (
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
              style={{
                color: rarityColor(it.rarity),
                filter: `drop-shadow(0 0 3px ${rarityColor(it.rarity)}80)`,
              }}
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
                    EQUIPAVEL [{it.slot}{it.armorTier ? " — " + it.armorTier : ""}]
                    {it.equipped ? " — EM USO" : ""}
                  </div>
                )}
                {it.curse && (
                  <div className="text-[7px] text-blood mt-[2px]">
                    AMALDICOADO — nao pode ser descartado
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface AlmanacRow {
  template: (typeof ALL_ITEMS_TEMPLATES)[number];
  owned: boolean;
  ownedCount: number;
  chance: number;
}

function AlmanacList({
  rows,
  currentDoor,
  ownedById,
  canActivateVision,
  visionActive,
  expanded,
  setExpanded,
  hovered,
  setHovered,
}: {
  rows: AlmanacRow[];
  currentDoor: number;
  ownedById: Map<string, Item[]>;
  canActivateVision: boolean;
  visionActive: boolean;
  expanded: string | null;
  setExpanded: (s: string | null) => void;
  hovered: string | null;
  setHovered: (s: string | null) => void;
}) {
  return (
    <div className="max-h-[60vh] overflow-y-auto">
      <div className="px-2 py-1 text-[7px] tracking-widest text-ink-dim border-b border-ink-dim/30 flex justify-between">
        <span>ITEM</span>
        <span>CHANCE</span>
      </div>
      {rows.map((row) => {
        const t = row.template;
        const ownedItems = ownedById.get(t.id) ?? [];
        const firstOwned = ownedItems[0];
        const dimmed = !row.owned;
        const hoverKey = `tpl-${t.id}`;
        const color = rarityColor(t.rarity);
        const isOlhoVidro = t.active === "olho_vidro";
        return (
          <div
            key={t.id}
            className="relative"
            onMouseEnter={() => setHovered(hoverKey)}
            onMouseLeave={() => setHovered(null)}
          >
            <button
              onClick={() => {
                if (firstOwned) {
                  setExpanded(expanded === firstOwned.uid ? null : firstOwned.uid);
                }
              }}
              disabled={!firstOwned}
              className={`w-full px-2 py-[3px] flex items-center gap-2 text-[9px] border-b border-ink-dim/15 transition-colors ${
                row.owned
                  ? "hover:bg-ember/10"
                  : "cursor-default"
              }`}
              style={{ opacity: dimmed ? 0.32 : 1 }}
            >
              <span
                className="text-[14px] w-4 text-center shrink-0"
                style={{
                  color,
                  filter: row.owned ? `drop-shadow(0 0 3px ${color}90)` : "none",
                }}
              >
                {t.glyph}
              </span>
              <span
                className="flex-1 text-left truncate"
                style={{ color: row.owned ? color : "#c9c4b0" }}
              >
                {t.name}
                {row.ownedCount > 1 && (
                  <span className="text-[7px] text-ember-bright ml-1">x{row.ownedCount}</span>
                )}
                {firstOwned?.equipped && (
                  <span className="text-[7px] text-ember-bright ml-1">[E]</span>
                )}
                {t.curse && (
                  <span className="text-[7px] text-blood ml-1">✝</span>
                )}
                {isOlhoVidro && canActivateVision && !visionActive && (
                  <span className="text-[7px] text-rare ml-1 animate-pulse">●</span>
                )}
              </span>
              <span
                className="text-[8px] shrink-0 tabular-nums"
                style={{ color: row.owned ? "#8b9a6f" : "#6b6f7a" }}
              >
                {row.owned
                  ? "TEM"
                  : row.chance >= 1
                  ? `${row.chance.toFixed(0)}%`
                  : `${row.chance.toFixed(1)}%`}
              </span>
            </button>

            {hovered === hoverKey && (
              <div className="absolute right-full mr-2 bottom-0 w-[200px] bg-bg border border-ember/60 p-2 text-[9px] text-ink z-50 pointer-events-none shadow-lg">
                <div className="text-[10px]" style={{ color }}>
                  {t.name} <span className="text-[7px]">[{t.rarity}]</span>
                </div>
                <div className="text-ink-dim italic mt-1 text-[8px]">{t.desc}</div>
                <div className="mt-1 text-mind-bright text-[8px]">+ {t.upside}</div>
                {t.downside && <div className="text-blood text-[8px]">- {t.downside}</div>}
                {t.slot && (
                  <div className="text-[7px] text-ember-bright mt-[2px]">
                    EQUIPAVEL [{t.slot}{t.armorTier ? " — " + t.armorTier : ""}]
                  </div>
                )}
                {t.curse && (
                  <div className="text-[7px] text-blood mt-[2px]">AMALDICOADO</div>
                )}
                <div className="mt-1 text-[7px] text-ink-dim border-t border-ink-dim/30 pt-1">
                  {row.owned
                    ? `Voce possui (${row.ownedCount}). Clique para acoes.`
                    : `Chance de aparecer agora: ${row.chance.toFixed(2)}%`}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ActionPanel({
  item: it,
  currentDoor,
  inCombat,
  canActivateVision,
  visionActive,
  onUseItem,
  onEquip,
  onDiscard,
  onActivateVision,
  onClose,
}: {
  item: Item;
  currentDoor: number;
  inCombat: boolean;
  canActivateVision: boolean;
  visionActive: boolean;
  onUseItem: (uid: string) => void;
  onEquip: (uid: string) => void;
  onDiscard: (uid: string) => void;
  onActivateVision: () => void;
  onClose: () => void;
}) {
  const locked = !canDiscard(it, currentDoor);
  const dur = currentDoor - it.acquiredAtDoor;
  const isVisionItem = it.active === "olho_vidro";
  const isConsumable = !!it.active && !isVisionItem && it.active !== "totem_tempo";
  return (
    <div className="border-t border-ember/40 p-2 text-[9px] text-ink">
      <div className="flex items-start gap-2">
        <span
          style={{
            color: rarityColor(it.rarity),
            filter: `drop-shadow(0 0 3px ${rarityColor(it.rarity)})`,
          }}
          className="text-[16px]"
        >
          {it.glyph}
        </span>
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
              onClose();
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
                onClose();
              } else if (inCombat) {
                onUseItem(it.uid);
                onClose();
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
              onClose();
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
              onClose();
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
              onClose();
            }
          }}
          disabled={!canDiscard(it, currentDoor)}
          className="text-[8px] px-2 py-1 border border-blood text-blood hover:bg-blood/20 disabled:border-ink-dim disabled:text-ink-dim"
        >
          {it.curse ? "AMALDICOADO" : locked ? `BLOQ (${2 - dur})` : "DESCARTAR"}
        </button>
        <button
          onClick={onClose}
          className="text-[8px] px-2 py-1 text-ink-dim hover:text-ember-bright ml-auto"
        >
          fechar
        </button>
      </div>
    </div>
  );
}
