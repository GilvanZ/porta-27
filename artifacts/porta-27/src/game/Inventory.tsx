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
  const [almanacSelected, setAlmanacSelected] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const hoveredItem = useMemo(() => {
    if (!hovered || hovered.startsWith("tpl-")) return null;
    return items.find((it) => it.uid === hovered) ?? null;
  }, [hovered, items]);

  const hoveredTemplate = useMemo(() => {
    if (!hovered || !hovered.startsWith("tpl-")) return null;
    return ALL_ITEMS_TEMPLATES.find((t) => `tpl-${t.id}` === hovered) ?? null;
  }, [hovered]);

  const selectedTemplate = useMemo(
    () => ALL_ITEMS_TEMPLATES.find((t) => t.id === almanacSelected) ?? null,
    [almanacSelected]
  );

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
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end overflow-visible">
      {!isOpen ? (
        <button
          onClick={() => {
            setIsOpen(true);
            setAlmanacOpen(false);
            setExpanded(null);
            setAlmanacSelected(null);
          }}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-ember/60 bg-bg-soft/95 px-4 py-3 text-[12px] font-bold text-ember-bright shadow-[0_0_18px_rgba(255,140,66,0.25)] hover:bg-ember/10 transition"
          aria-label="Abrir inventário"
        >
          <span>INVENTÁRIO</span>
          <span className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full bg-ember text-black text-[11px] font-semibold px-2">
            {items.length}
          </span>
        </button>
      ) : (
        <div className="pointer-events-auto w-[90vw] max-w-[380px] max-h-[80vh] sm:max-h-[60vh] overflow-hidden rounded-2xl border-2 border-ember/60 bg-bg-soft/95 backdrop-blur-sm shadow-[0_0_28px_rgba(255,140,66,0.35)]">
          <div className="flex items-center justify-between border-b-2 border-ember/50 px-4 py-3">
            <button 
              onClick={() => {
                setAlmanacOpen((v) => !v);
                setExpanded(null);
                setAlmanacSelected(null);
              }}
              className="text-sm-mobile text-xs-desktop tracking-[0.3em] text-ember-bright hover:text-white transition-colors font-bold text-left "
            >
              {almanacOpen ? "ALMANAQUE ▾" : "INVENTARIO ▸"}
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                setAlmanacOpen(false);
                setExpanded(null);
                setAlmanacSelected(null);
              }}
              className="text-red-500 text-lg hover:text-red-70 "
            >
              x
            </button>
          </div>

          {visionActive && (
            <div className="px-4 py-3 text-sm-mobile text-xs-desktop text-rare border-b border-rare/40 animate-pulse font-bold ">
              ◎ VISÃO ATIVA — passe o mouse nas portas
            </div>
          )}

          <div className="max-h-[60vh] sm:max-h-[50vh] overflow-y-auto sm:overflow-visible  ">
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
                setSelectedTemplateId={setAlmanacSelected}
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
      )}
      {(hoveredItem || hoveredTemplate) && (
        <FloatingTooltip
          item={hoveredItem}
          template={hoveredTemplate}
          currentDoor={currentDoor}
        />
      )}
      {selectedTemplate && (
        <AlmanacDetailPanel
          template={selectedTemplate}
          ownedById={ownedById}
          currentDoor={currentDoor}
          chance={almanacRows.find(r => r.template.id === selectedTemplate.id)?.chance ?? 0}
          clearSelection={() => setAlmanacSelected(null)}
        />
      )}
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

  // Sort items: equipped first, then by rarity (worst→best), then by acquisition time (oldest→newest).
  return (
    <div className="p-2 grid grid-cols-6 sm:grid-cols-6 gap-1 max-h-[300px] sm:max-h-[200px] overflow-y-auto sm:overflow-visible">
      {items.length === 0 && (
        <div className="col-span-full text-xs-mobile sm:text-sm-desktop text-ink-dim italic text-center py-3">
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
  setSelectedTemplateId,
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
  setSelectedTemplateId: (id: string) => void;
}) {
  return (
    <div className="max-h-[60vh] sm:max-h-[50vh] overflow-y-auto sm:overflow-visible ">
      <div className="px-2 py-1 text-xs-mobile sm:text-sm-desktop tracking-[0.2em] text-ink-dim border-b border-ink-dim/30 flex justify-between ">
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
          <div key={t.id} className="relative" onMouseEnter={() => setHovered(hoverKey)} onMouseLeave={() => setHovered(null)}>
            <button
              onClick={() => setSelectedTemplateId(t.id)}
              className={`w-full px-2 py-[4px] flex items-center gap-2 text-xs-mobile sm:text-sm-desktop border-b border-ink-dim/15 transition-colors ${
                row.owned
                  ? "hover:bg-ember/10"
                  : "cursor-default"
              }`}
              style={{ opacity: dimmed ? 0.35 : 1 }}
            >
              <span
                className="text-[16px] w-4 text-center shrink-0"
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
                  <span className="text-[20px] text-ember-bright ml-1">x{row.ownedCount}</span>
                )}
                {firstOwned?.equipped && (
                  <span className="text-[20px] text-ember-bright ml-1">[E]</span>
                )}
                {t.curse && (
                  <span className="text-[20px] text-blood ml-1">✝</span>
                )}
                {isOlhoVidro && canActivateVision && !visionActive && (
                  <span className="text-[20px] text-rare ml-1 animate-pulse">●</span>
                )}
              </span>
              <span
                className="text-[10px] shrink-0 tabular-nums"
                style={{ color: row.owned ? "#8b9a6f" : "#ffffff" }}
              >
                {row.owned
                  ? "TEM"
                  : row.chance >= 1
                  ? `${row.chance.toFixed(0)}%`
                  : `${row.chance.toFixed(1)}%`}
              </span>
            </button>

          </div>
        );
      })}
    </div>
  );
}

function FloatingTooltip({
  item,
  template,
  currentDoor,
}: {
  item: Item | null;
  template: (typeof ALL_ITEMS_TEMPLATES)[number] | null;
  currentDoor: number;
}) {
  const detail = item ?? template;
  if (!detail) return null;
  return (
    // The tooltip is rendered in the inventory, which is on the bottom right. So we position it to the top right of the hovered item.
    <div className="pointer-events-none absolute top-3 right-full mr-3 w-[300px] max-w-[340px] rounded-2xl bg-black/90 p-3 text-sm-mobile sm:text-sm-desktop text-ink shadow-[0_24px_70px_rgba(0,0,0,0.45)] z-50">
      <div className="flex items-center justify-between gap-2">
        <span className="text-lg-mobile font-bold" style={{ color: rarityColor(detail.rarity) }}>
          {detail.glyph} {detail.name}
        </span>
        <span className="text-[10px] uppercase tracking-[0.25em] text-ember-bright">
          [{detail.rarity}]
        </span>
      </div>
      <div className="mt-2 text-xs-mobile sm:text-sm-desktop leading-5 text-ink-dim italic">
        {detail.desc}
      </div>
      <div className="mt-2 text-sm-mobile text-mind-bright">+ {detail.upside}</div>
      {detail.downside && <div className="mt-1 text-sm-mobile text-blood">- {detail.downside}</div>}
      {detail.slot && (
        <div className="mt-2 text-xs-mobile sm:text-sm-desktop text-ember-bright">
          EQUIPAVEL [{detail.slot}{detail.armorTier ? ` — ${detail.armorTier}` : ``}]
          {item?.equipped ? " — EM USO" : ""}
        </div>
      )}
      {detail.curse && (
        <div className="mt-2 text-xs-mobile text-blood">AMALDICOADO — nao pode ser descartado</div>
      )}
      {item && (
        <div className="mt-2 text-[11px] text-ink-dim border-t border-ink-dim/20 pt-2">
          Carregado por {currentDoor - item.acquiredAtDoor} porta{currentDoor - item.acquiredAtDoor !== 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

function AlmanacDetailPanel({
  template,
  ownedById,
  currentDoor,
  chance,
  clearSelection,
}: {
  template: (typeof ALL_ITEMS_TEMPLATES)[number];
  ownedById: Map<string, Item[]>;
  currentDoor: number;
  chance: number;
  clearSelection: () => void;
}) {
  const ownedItems = ownedById.get(template.id) ?? [];
  const ownedCount = ownedItems.length;
  const equipped = ownedItems.some((item) => item.equipped);
  return (
    <div className="pointer-events-none absolute top-3 left-0 w-[300px] max-w-[340px] rounded-2xl bg-black/90 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.45)] text-sm-mobile sm:text-sm-desktop text-ink z-50">
      <div className="flex items-center justify-between gap-2">
        <span className="text-lg-mobile font-bold" style={{ color: rarityColor(template.rarity) }}>
          {template.glyph} {template.name}
        </span>
        <button
          onClick={clearSelection}
          className="pointer-events-auto text-red-500 text-lg hover:text-red-700"
        >
          x
        </button>
      </div>
      <div className="mt-3 text-sm-mobile text-ink leading-5 italic bg-black/90 p-2 rounded">
        {template.desc}
      </div>
      <div className="mt-3 text-sm-mobile text-mind-bright bg-black/90">+ {template.upside}</div>
      {template.downside && <div className="mt-1 text-sm-mobile text-blood">- {template.downside}</div>}
      {template.slot && (
        <div className="mt-2 text-xs-mobile sm:text-sm-desktop text-ember-bright">
          EQUIPAVEL [{template.slot}{template.armorTier ? ` — ${template.armorTier}` : ``}]
        </div>
      )}
      {template.curse && (
        <div className="mt-2 text-xs-mobile text-blood">AMALDICOADO — este item nao pode ser descartado</div>
      )}
      <div className="mt-3 text-xs-mobile text-ink-dim border-t border-ink-dim/20 pt-2">
        {ownedCount > 0
          ? `Voce possui ${ownedCount} copia(s). ${equipped ? "Alguma esta equipada." : "Clique no item no inventario para usar ou equipar."}`
          : `Chance de aparecer agora: ${chance.toFixed(2)}%`}
      </div>
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
    <div className="border-t border-ember/40 p-2 text-xs-mobile sm:text-sm-desktop text-ink">
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
        <div className="flex-1 text-[14px] font-bold">
          <div style={{ color: rarityColor(it.rarity) }}>{it.name}</div>
          <div className="text-ink-dim italic text-[14px]">{it.desc}</div>
          <div className="mt-[2px] text-mind-bright text-[14px]">+ {it.upside}</div>
          {it.downside && <div className="text-blood text-[14px]">- {it.downside}</div>}
          <div className="text-ink-dim text-[14px] mt-1">
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
            className="text-[14px] px-2 py-1 border border-rare text-rare hover:bg-rare/20"
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
            className="text-[14px] px-2 py-1 border border-ember text-ember hover:bg-ember/20 disabled:border-ink-dim disabled:text-ink-dim"
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
            className="text-[14px] px-2 py-1 border border-ember-bright text-ember-bright hover:bg-ember/20"
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
            className="text-[14px] px-2 py-1 border border-ink-dim text-ink hover:bg-ink/20"
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
          className="text-[14px] px-2 py-1 border border-blood text-blood hover:bg-blood/20 disabled:border-ink-dim disabled:text-ink-dim"
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
