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
  };
  for (const it of items) {
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
  }
  return a;
}

const HINT_BANK_BY_KIND: Record<RoomKind, Hint[]> = {
  empty: ["SILENCIO ABSOLUTO", "FRIO INTENSO", "??????"],
  enemy: ["PERIGO ALTO", "PRESENCA VIVA", "CHEIRO DE FERRO", "MURMURIOS"],
  trap: ["SONS METALICOS", "SILENCIO ABSOLUTO", "FRIO INTENSO", "??????"],
  chest: ["TESOURO", "LUZ DISTANTE", "??????"],
  puzzle: ["EVENTO ESTRANHO", "MURMURIOS", "??????"],
  npc: ["MURMURIOS", "PRESENCA VIVA", "EVENTO ESTRANHO"],
  shop: ["LUZ DISTANTE", "TESOURO", "MURMURIOS"],
  shrine: ["LUZ DISTANTE", "EVENTO ESTRANHO", "SILENCIO ABSOLUTO"],
  boss: ["PERIGO ALTO", "PRESENCA VIVA", "CHEIRO DE FERRO", "SONS METALICOS"],
  rare: ["EVENTO ESTRANHO", "LUZ DISTANTE", "??????"],
  shortcut: ["SONS METALICOS", "PERIGO ALTO", "??????"],
};

const RED_HERRINGS: Hint[] = [
  "SILENCIO ABSOLUTO",
  "FRIO INTENSO",
  "MURMURIOS",
  "??????",
  "LUZ DISTANTE",
  "CHEIRO DE FERRO",
];

function generateHints(rng: () => number, kind: RoomKind, clarity: number): Hint[] {
  const truthful = HINT_BANK_BY_KIND[kind];
  const hints: Hint[] = [];

  // Number of hints
  const count = intBetween(rng, 1, 2);

  // chance of being truthful per hint based on clarity
  const truthChance = Math.min(0.95, 0.45 + clarity * 0.18);

  for (let i = 0; i < count; i++) {
    if (chance(rng, truthChance)) {
      hints.push(pick(rng, truthful));
    } else {
      hints.push(pick(rng, RED_HERRINGS));
    }
  }
  // dedupe
  return Array.from(new Set(hints));
}

function pickKind(rng: () => number, doorNumber: number, eff: AggregatedEffects): RoomKind {
  // Boss every ~10 doors after door 25, plus final
  const tier = Math.floor(doorNumber / 10);
  const isBossDoor = doorNumber > 0 && doorNumber % 10 === 0 && doorNumber >= 20;

  // Rare event 1% base, modified
  const rareRoll = 0.01 + eff.rareChanceBonus;

  if (chance(rng, rareRoll)) return "rare";
  if (isBossDoor && chance(rng, 0.55)) return "boss";

  const diff = eff.difficultyMod;
  // Base weights, scaled by tier
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
  items: Item[],
  eff: AggregatedEffects
): Door[] {
  const doors: Door[] = [];
  for (let i = 0; i < 3; i++) {
    let kind = pickKind(rng, doorNumber, eff);
    let skipAmount = 1;
    let shortcutCost: number | undefined;

    // Possible shortcut transformation
    if (eff.skipChance > 0 && chance(rng, eff.skipChance)) {
      kind = "shortcut";
      skipAmount = intBetween(rng, 3, 8);
      shortcutCost = intBetween(rng, 1, 3);
    } else if (chance(rng, 0.05) && doorNumber > 5) {
      // organic shortcuts
      kind = "shortcut";
      skipAmount = intBetween(rng, 4, 12);
      shortcutCost = intBetween(rng, 2, 4);
    }

    const targetNumber = Math.min(100, doorNumber + skipAmount);
    const hints = generateHints(rng, kind, eff.hintClarity);

    doors.push({
      id: `d-${doorNumber}-${i}-${Math.floor(rng() * 1e6)}`,
      doorNumber: targetNumber,
      hints,
      trueKind: kind,
      skipAmount,
      shortcutCost,
    });
  }
  // Vision bonus: reveal one door's true kind by appending a marker hint
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
