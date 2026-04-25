import type { Door, Hint, Item, RoomKind } from "./types";
import { chance, intBetween, makeRng, pick } from "./rng";

export interface AggregatedEffects {
  hintClarity: number;
  difficultyMod: number;
  lootMod: number;
  sanityDrainPerRoom: number;
  hpDrainPerRoom: number;
  trapResist: number;
  enemyDmgMod: number;
  rareChanceBonus: number;
  skipChance: number;
  visionBonus: boolean;
  mapBonus: boolean;
  goldGainOnDoor: number;
  maxHpBonus: number;
  maxSanityBonus: number;
  damageReduction: number;
  attackBonus: number;
  hpRegenPerRoom: number;
  falseHints: number;
}

export function aggregateEffects(items: Item[]): AggregatedEffects {
  const a: AggregatedEffects = {
    hintClarity: 0,
    difficultyMod: 0,
    lootMod: 0,
    sanityDrainPerRoom: 0,
    hpDrainPerRoom: 0,
    trapResist: 0,
    enemyDmgMod: 0,
    rareChanceBonus: 0,
    skipChance: 0,
    visionBonus: false,
    mapBonus: false,
    goldGainOnDoor: 0,
    maxHpBonus: 0,
    maxSanityBonus: 0,
    damageReduction: 0,
    attackBonus: 0,
    hpRegenPerRoom: 0,
    falseHints: 0,
  };
  for (const it of items) {
    // Equipment effects only count when equipped
    if (it.slot && !it.equipped) continue;
    const e = it.effect;
    a.hintClarity += e.hintClarity ?? 0;
    a.difficultyMod += e.difficultyMod ?? 0;
    a.lootMod += e.lootMod ?? 0;
    a.sanityDrainPerRoom += e.sanityDrainPerRoom ?? 0;
    a.hpDrainPerRoom += e.hpDrainPerRoom ?? 0;
    a.trapResist = Math.min(0.85, a.trapResist + (e.trapResist ?? 0));
    a.enemyDmgMod += e.enemyDmgMod ?? 0;
    a.rareChanceBonus += e.rareChanceBonus ?? 0;
    a.skipChance += e.skipChance ?? 0;
    a.visionBonus = a.visionBonus || !!e.visionBonus;
    a.mapBonus = a.mapBonus || !!e.mapBonus;
    a.goldGainOnDoor += e.goldGainOnDoor ?? 0;
    a.maxHpBonus += e.maxHpBonus ?? 0;
    a.maxSanityBonus += e.maxSanityBonus ?? 0;
    a.damageReduction = Math.min(0.85, a.damageReduction + (e.damageReduction ?? 0));
    a.attackBonus += e.attackBonus ?? 0;
    a.hpRegenPerRoom += e.hpRegenPerRoom ?? 0;
    a.falseHints += e.falseHints ?? 0;
  }
  return a;
}

const HINT_BANK_BY_KIND: Record<RoomKind, Hint[]> = {
  empty: ["SILENCIO ABSOLUTO", "FRIO INTENSO", "SALA SEGURA", "??????"],
  enemy: ["PERIGO ALTO", "PRESENCA VIVA", "CHEIRO DE FERRO", "MURMURIOS"],
  trap: ["SONS METALICOS", "FRIO INTENSO", "CHEIRO DE FERRO", "??????"],
  chest: ["TESOURO", "LUZ DISTANTE", "SALA SEGURA", "??????"],
  puzzle: ["EVENTO ESTRANHO", "MURMURIOS", "LUZ DISTANTE", "??????"],
  npc: ["PRESENCA VIVA", "EVENTO ESTRANHO", "LUZ DISTANTE"],
  shop: ["LUZ DISTANTE", "TESOURO", "SALA SEGURA"],
  shrine: ["LUZ DISTANTE", "EVENTO ESTRANHO", "SILENCIO ABSOLUTO"],
  boss: ["PERIGO ALTO", "PRESENCA VIVA", "CHEIRO DE FERRO", "SONS METALICOS"],
  rare: ["EVENTO ESTRANHO", "LUZ DISTANTE", "CHEIRO DE FERRO", "??????"],
  shortcut: ["SONS METALICOS", "PERIGO ALTO", "SILENCIO ABSOLUTO"],
};

const RED_HERRINGS: Hint[] = [
  "SILENCIO ABSOLUTO",
  "FRIO INTENSO",
  "MURMURIOS",
  "??????",
  "LUZ DISTANTE",
  "CHEIRO DE FERRO",
];

function isContradictory(existing: Hint[], next: Hint): boolean {
  if (existing.includes("SILENCIO ABSOLUTO") && next === "MURMURIOS") return true;
  if (existing.includes("MURMURIOS") && next === "SILENCIO ABSOLUTO") return true;
  if (existing.includes("MURMURIOS") && next === "SALA SEGURA") return true;
  if (existing.includes("SALA SEGURA") && next === "MURMURIOS") return true;
  if (existing.includes("SILENCIO ABSOLUTO") && next === "LUZ DISTANTE") return false;
  if (existing.includes("SILENCIO ABSOLUTO") && next === "PERIGO ALTO") return false;
  return false;
}

function pickHint(rng: () => number, pool: Hint[], exclude: Hint[]): Hint {
  const candidates = pool.filter((hint) => !exclude.includes(hint));
  if (candidates.length === 0) return pool[0];
  return pick(rng, candidates);
}

function generateHints(rng: () => number, kind: RoomKind, clarity: number, falseHints: number): Hint[] {
  const truthful = HINT_BANK_BY_KIND[kind];
  const hints: Hint[] = [];

  const count = intBetween(rng, 1, 2) + (falseHints > 0 ? 1 : 0);
  const truthChance = Math.min(0.95, 0.45 + clarity * 0.18 - falseHints * 0.12);

  for (let i = 0; i < count; i++) {
    const candidate = chance(rng, truthChance)
      ? pickHint(rng, truthful, hints)
      : pickHint(rng, RED_HERRINGS, hints);
    if (!isContradictory(hints, candidate)) {
      hints.push(candidate);
    }
  }
  return Array.from(new Set(hints));
}

function pickKind(rng: () => number, doorNumber: number, eff: AggregatedEffects): RoomKind {
  const tier = Math.floor(doorNumber / 10);
  const isBossDoor = doorNumber > 0 && doorNumber % 10 === 0 && doorNumber >= 20;
  const rareRoll = 0.01 + eff.rareChanceBonus;

  if (chance(rng, rareRoll)) return "rare";
  if (isBossDoor && chance(rng, 0.55)) return "boss";

  const diff = eff.difficultyMod;
  const w: Record<RoomKind, number> = {
    empty: Math.max(4, 14 - tier * 1.2),
    enemy: 14 + tier * 1.5 + diff * 8,
    trap: 8 + tier * 0.8 + diff * 5,
    chest: 8,
    puzzle: 7,
    npc: 5,
    shop: 3,
    shrine: 2.5,
    boss: 0,
    rare: 0,
    shortcut: 0,
  };

  const total = Object.values(w).reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (const k of Object.keys(w) as RoomKind[]) {
    r -= w[k];
    if (r <= 0) return k;
  }
  return "empty";
}

export function generateDoors(
  rng: () => number,
  doorNumber: number,
  _items: Item[],
  eff: AggregatedEffects
): Door[] {
  const doors: Door[] = [];
  for (let i = 0; i < 3; i++) {
    let kind = pickKind(rng, doorNumber, eff);
    let skipAmount = 1;
    let shortcutCost: number | undefined;

    if (eff.skipChance > 0 && chance(rng, eff.skipChance)) {
      kind = "shortcut";
      skipAmount = intBetween(rng, 3, 8);
      shortcutCost = intBetween(rng, 1, 3);
    } else if (chance(rng, 0.05) && doorNumber > 5) {
      kind = "shortcut";
      skipAmount = intBetween(rng, 4, 12);
      shortcutCost = intBetween(rng, 2, 4);
    }

    const targetNumber = Math.min(100, doorNumber + skipAmount);
    const hints = generateHints(rng, kind, eff.hintClarity, eff.falseHints);

    doors.push({
      id: `d-${doorNumber}-${i}-${Math.floor(rng() * 1e6)}`,
      doorNumber: targetNumber,
      hints,
      trueKind: kind,
      skipAmount,
      shortcutCost,
    });
  }
  if (eff.visionBonus && doors.length > 0) {
    const idx = Math.floor(rng() * doors.length);
    const trueLabel = trueKindLabel(doors[idx].trueKind);
    doors[idx].hints = [trueLabel as Hint, ...doors[idx].hints.slice(0, 1)];
  }
  return doors;
}

function trueKindLabel(k: RoomKind): string {
  switch (k) {
    case "enemy":
      return "PERIGO ALTO";
    case "trap":
      return "SONS METALICOS";
    case "chest":
      return "TESOURO";
    case "puzzle":
      return "EVENTO ESTRANHO";
    case "npc":
      return "PRESENCA VIVA";
    case "shop":
      return "LUZ DISTANTE";
    case "shrine":
      return "LUZ DISTANTE";
    case "boss":
      return "PERIGO ALTO";
    case "rare":
      return "EVENTO ESTRANHO";
    case "shortcut":
      return "SONS METALICOS";
    default:
      return "SILENCIO ABSOLUTO";
  }
}

export function generateMapPreview(
  baseSeed: number,
  startDoor: number,
  count: number,
  items: Item[]
): RoomKind[] {
  const eff = aggregateEffects(items);
  const out: RoomKind[] = [];
  for (let i = 0; i < count; i++) {
    const seed = baseSeed + (startDoor + i) * 9301;
    const rng = makeRng(seed);
    out.push(pickKind(rng, startDoor + i, eff));
  }
  return out;
}

export function trueKindReadable(k: RoomKind): string {
  switch (k) {
    case "empty":
      return "Sala Vazia";
    case "enemy":
      return "Inimigo";
    case "trap":
      return "Armadilha";
    case "chest":
      return "Bau";
    case "puzzle":
      return "Enigma";
    case "npc":
      return "NPC";
    case "shop":
      return "Loja";
    case "shrine":
      return "Altar";
    case "boss":
      return "CHEFE";
    case "rare":
      return "Sala Rara";
    case "shortcut":
      return "Atalho";
  }
}
