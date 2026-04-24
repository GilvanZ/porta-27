import type { ArmorTier, Item, Rarity } from "./types";

let _uidCounter = 1;
export function newUid() {
  return `u-${Date.now().toString(36)}-${(_uidCounter++).toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

type Template = Omit<Item, "uid" | "acquiredAtDoor" | "equipped">;

const ARMOR_TIER_REDUCTION: Record<ArmorTier, number> = {
  couro: 0.05,
  ouro: 0.10,
  adamantium: 0.15,
  encantada: 0.20,
};
const ARMOR_TIER_RARITY: Record<ArmorTier, Rarity> = {
  couro: "Comum",
  ouro: "Raro",
  adamantium: "Épico",
  encantada: "Divino",
};
const TIER_LABEL: Record<ArmorTier, string> = {
  couro: "de Couro",
  ouro: "de Ouro",
  adamantium: "de Adamantium",
  encantada: "Encantada",
};
const TIER_LABEL_M: Record<ArmorTier, string> = {
  couro: "de Couro",
  ouro: "de Ouro",
  adamantium: "de Adamantium",
  encantada: "Encantado",
};

function makeArmor(slot: "boots" | "chest" | "helmet" | "weapon", tier: ArmorTier): Template {
  const red = ARMOR_TIER_REDUCTION[tier];
  const rarity = ARMOR_TIER_RARITY[tier];
  if (slot === "boots") {
    const skip = 0.05 + ["couro", "ouro", "adamantium", "encantada"].indexOf(tier) * 0.05;
    return {
      id: `botas_${tier}`,
      name: `Botas ${TIER_LABEL[tier]}`,
      glyph: "ᗉ",
      rarity,
      slot: "boots",
      armorTier: tier,
      desc: "Calcado reforcado para o corredor.",
      upside: `-${Math.round(red * 100)}% dano e +${Math.round(skip * 100)}% chance de atalho`,
      effect: { damageReduction: red, skipChance: skip },
      tags: ["armadura", "velocidade"],
    };
  }
  if (slot === "chest") {
    return {
      id: `peitoral_${tier}`,
      name: `Peitoral ${TIER_LABEL_M[tier]}`,
      glyph: "▣",
      rarity,
      slot: "chest",
      armorTier: tier,
      desc: "Armadura cobrindo o torso.",
      upside: `-${Math.round(red * 100)}% dano sofrido`,
      effect: { damageReduction: red },
      tags: ["armadura"],
    };
  }
  if (slot === "helmet") {
    return {
      id: `capacete_${tier}`,
      name: `Capacete ${TIER_LABEL_M[tier]}`,
      glyph: "⌒",
      rarity,
      slot: "helmet",
      armorTier: tier,
      desc: "Protege a cabeca contra golpes.",
      upside: `-${Math.round(red * 100)}% dano sofrido`,
      effect: { damageReduction: red },
      tags: ["armadura"],
    };
  }
  // weapon
  const atk = ["couro", "ouro", "adamantium", "encantada"].indexOf(tier) + 1;
  const wname = tier === "couro" ? "Adaga de Ferro" : tier === "ouro" ? "Espada de Ouro" : tier === "adamantium" ? "Lamina de Adamantium" : "Lamina Encantada";
  return {
    id: `arma_${tier}`,
    name: wname,
    glyph: "†",
    rarity,
    slot: "weapon",
    armorTier: tier,
    desc: "Arma equipavel para combate.",
    upside: `+${atk} dano em combate`,
    effect: { attackBonus: atk },
    tags: ["arma"],
  };
}

const ARMORS: Template[] = [
  ...(["couro", "ouro", "adamantium", "encantada"] as ArmorTier[]).flatMap((t) => [
    makeArmor("boots", t),
    makeArmor("chest", t),
    makeArmor("helmet", t),
    makeArmor("weapon", t),
  ]),
];

const CONSUMABLES: Template[] = [
  {
    id: "olho_vidro",
    name: "Olho de Vidro",
    glyph: "◎",
    rarity: "Raro",
    active: "olho_vidro",
    desc: "Enxerga atraves da madeira por um instante.",
    upside: "Ative para revelar o conteudo das portas no proximo corredor",
    effect: {},
    tags: ["visao", "ativo"],
  },
  {
    id: "totem_tempo",
    name: "Totem do Tempo",
    glyph: "⌛",
    rarity: "Divino",
    active: "totem_tempo",
    desc: "Uma engrenagem que gira contra o relogio.",
    upside: "Se voce morrer, revive 5 portas atras (consumido)",
    effect: {},
    tags: ["raro", "tempo"],
  },
  {
    id: "pocao_vida",
    name: "Pocao de Vida",
    glyph: "♥",
    rarity: "Comum",
    active: "pocao_vida",
    desc: "Liquido vermelho espesso.",
    upside: "Restaura 4 de vida",
    effect: {},
    tags: ["cura"],
  },
  {
    id: "pocao_sanidade",
    name: "Pocao de Sanidade",
    glyph: "✧",
    rarity: "Comum",
    active: "pocao_sanidade",
    desc: "Cheira a hortela queimada.",
    upside: "Restaura 4 de sanidade",
    effect: {},
    tags: ["mente"],
  },
  {
    id: "bomba_fumaca",
    name: "Bomba de Fumaca",
    glyph: "❂",
    rarity: "Raro",
    active: "bomba_fumaca",
    desc: "Bola de papel preto com pavio.",
    upside: "Garante fuga de qualquer combate",
    effect: {},
    tags: ["combate"],
  },
];

const PASSIVES: Template[] = [
  {
    id: "lente_rachada",
    name: "Lente Rachada",
    glyph: "◉",
    rarity: "Raro",
    desc: "Uma lente quebrada que mostra mais do que devia.",
    upside: "Pistas das portas mais claras",
    downside: "Atrai salas mais perigosas",
    effect: { hintClarity: 1, difficultyMod: 0.15 },
    tags: ["visao"],
  },
  {
    id: "saco_furado",
    name: "Saco Furado",
    glyph: "▲",
    rarity: "Comum",
    desc: "Mais espaco, mais loot, menos sanidade.",
    upside: "+50% loot dos baus, atrai inimigos",
    downside: "Drena sanidade a cada sala",
    effect: { lootMod: 0.5, sanityDrainPerRoom: 1, difficultyMod: 0.05 },
    tags: ["loot"],
  },
  {
    id: "mapa_rasgado",
    name: "Mapa Rasgado",
    glyph: "▤",
    rarity: "Raro",
    desc: "Mostra um pedaco do corredor adiante.",
    upside: "Pistas das portas seguintes",
    downside: "Inimigos atacam mais forte",
    effect: { mapBonus: true, enemyDmgMod: 0.25 },
    tags: ["visao"],
  },
  {
    id: "luva_couro",
    name: "Luva de Couro",
    glyph: "✋",
    rarity: "Comum",
    desc: "Resiste a armadilhas comuns.",
    upside: "40% de ignorar armadilhas",
    effect: { trapResist: 0.4 },
    tags: ["defesa"],
  },
  {
    id: "amuleto_estranho",
    name: "Amuleto Estranho",
    glyph: "♁",
    rarity: "Épico",
    desc: "Atrai eventos raros do corredor.",
    upside: "+15% chance de salas raras",
    downside: "-1 sanidade por sala",
    effect: { rareChanceBonus: 0.15, sanityDrainPerRoom: 1 },
    tags: ["raro"],
  },
  {
    id: "moeda_pesada",
    name: "Moeda Pesada",
    glyph: "◐",
    rarity: "Comum",
    desc: "Cada porta entrega uma moeda extra.",
    upside: "+1 ouro por porta",
    effect: { goldGainOnDoor: 1 },
    tags: ["economia"],
  },
  {
    id: "coracao_lata",
    name: "Coracao de Lata",
    glyph: "♥",
    rarity: "Raro",
    desc: "Mais vida, menos sanidade.",
    upside: "+5 vida maxima",
    downside: "-3 sanidade maxima",
    effect: { maxHpBonus: 5, maxSanityBonus: -3 },
    tags: ["vida"],
  },
  {
    id: "espelho_quebrado",
    name: "Espelho Quebrado",
    glyph: "◇",
    rarity: "Raro",
    desc: "Mais sanidade, menos vida.",
    upside: "+5 sanidade maxima",
    downside: "-3 vida maxima",
    effect: { maxSanityBonus: 5, maxHpBonus: -3 },
    tags: ["mente"],
  },
  {
    id: "cruz_invertida",
    name: "Cruz Invertida",
    glyph: "✝",
    rarity: "Épico",
    curse: true,
    desc: "Pisca quando algo terrivel se aproxima.",
    upside: "Pistas muito claras (+2 niveis)",
    downside: "Drena 2 sanidade por sala. Amaldicoado.",
    effect: { hintClarity: 2, sanityDrainPerRoom: 2 },
    tags: ["visao", "mente", "amaldicoado"],
  },
  {
    id: "vela_negra",
    name: "Vela Negra",
    glyph: "✦",
    rarity: "Épico",
    desc: "Queima silenciosamente.",
    upside: "Reduz drenos de sanidade pela metade",
    effect: { sanityDrainPerRoom: -1 },
    tags: ["mente"],
  },
  {
    id: "anel_regen",
    name: "Anel de Regeneracao",
    glyph: "○",
    rarity: "Épico",
    desc: "Pulsa morno na pele.",
    upside: "Regenera +1 vida a cada 2 salas",
    effect: { hpRegenPerRoom: 0.5 },
    tags: ["vida", "tempo"],
  },
  {
    id: "olho_falso",
    name: "Olho Falso",
    glyph: "◐",
    rarity: "Comum",
    curse: true,
    desc: "Brilha quando voce olha para outro lado.",
    upside: "Pistas extras nas portas",
    downside: "Algumas pistas sao falsas",
    effect: { hintClarity: 1, falseHints: 2 },
    tags: ["visao", "mentira"],
  },
  {
    id: "coroa_negra",
    name: "Coroa Negra",
    glyph: "♛",
    rarity: "Divino",
    curse: true,
    desc: "Esquenta sozinha. Pesa.",
    upside: "+8 vida maxima, +25% loot, +20% chance de raro",
    downside: "-2 sanidade por sala. Amaldicoado.",
    effect: { maxHpBonus: 8, lootMod: 0.25, rareChanceBonus: 0.20, sanityDrainPerRoom: 2 },
    tags: ["amaldicoado", "loot", "vida", "raro"],
  },
  {
    id: "talisma_drift",
    name: "Talisma do Drift",
    glyph: "✺",
    rarity: "Divino",
    desc: "Brilha contra o vento.",
    upside: "+3 vida maxima, +3 sanidade maxima, +1 ouro por porta",
    effect: { maxHpBonus: 3, maxSanityBonus: 3, goldGainOnDoor: 1 },
    tags: ["vida", "mente", "economia"],
  },
  {
    id: "faca_enferrujada",
    name: "Faca Enferrujada",
    glyph: "✚",
    rarity: "Comum",
    desc: "Reduz o impacto de pequenos golpes.",
    upside: "-30% dano de inimigos",
    effect: { enemyDmgMod: -0.3 },
    tags: ["defesa"],
  },
  {
    id: "frasco_sangue",
    name: "Frasco de Sangue",
    glyph: "♥",
    rarity: "Raro",
    curse: true,
    desc: "Quente e pulsante.",
    upside: "Regenera vida a cada sala",
    downside: "Drena sanidade a cada sala. Amaldicoado.",
    effect: { hpRegenPerRoom: 1, sanityDrainPerRoom: 2 },
    tags: ["vida", "amaldicoado"],
  },
];

export const ALL_ITEMS_TEMPLATES: Template[] = [...PASSIVES, ...CONSUMABLES, ...ARMORS];

function instantiate(t: Template, doorNumber: number): Item {
  return {
    ...t,
    uid: newUid(),
    acquiredAtDoor: doorNumber,
    equipped: false,
  };
}

function tierWeight(r: Rarity, dn: number): number {
  const base: Record<Rarity, number> = { Comum: 50, Raro: 28, "Épico": 15, Divino: 7 };
  const prog = Math.min(1, dn / 80);
  return base[r] * (r === "Comum" ? 1 - prog * 0.5 : 1 + prog * (r === "Divino" ? 1.5 : r === "Épico" ? 0.8 : 0.3));
}

export function pickRandomItem(rng: () => number, doorNumber: number, exclude: string[] = []): Item {
  const pool = ALL_ITEMS_TEMPLATES.filter((t) => !exclude.includes(t.id));
  const list = pool.length ? pool : ALL_ITEMS_TEMPLATES;
  const weights = list.map((t) => tierWeight(t.rarity, doorNumber));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return instantiate(list[i], doorNumber);
  }
  return instantiate(list[list.length - 1], doorNumber);
}

export function itemAppearanceChance(doorNumber: number, ownedIds: string[] = []): Record<string, number> {
  const pool = ALL_ITEMS_TEMPLATES.filter((t) => !ownedIds.includes(t.id));
  const list = pool.length ? pool : ALL_ITEMS_TEMPLATES;
  const weights = list.map((t) => tierWeight(t.rarity, doorNumber));
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const out: Record<string, number> = {};
  for (let i = 0; i < list.length; i++) {
    out[list[i].id] = (weights[i] / total) * 100;
  }
  // Items already owned have 0% chance to drop again
  for (const id of ownedIds) {
    if (out[id] === undefined) out[id] = 0;
  }
  return out;
}

export const RARITY_RANK: Record<Rarity, number> = { Comum: 0, Raro: 1, "Épico": 2, Divino: 3 };

export function pickShopItems(rng: () => number, owned: string[], doorNumber: number): Item[] {
  const out: Item[] = [];
  const used = [...owned];
  for (let i = 0; i < 3; i++) {
    const it = pickRandomItem(rng, doorNumber, used);
    used.push(it.id);
    out.push(it);
  }
  return out;
}

export function makeStarterItems(): Item[] {
  // 3 low-tier helpful items only
  const starters = ["faca_enferrujada", "luva_couro", "moeda_pesada"];
  return starters
    .map((id) => ALL_ITEMS_TEMPLATES.find((t) => t.id === id))
    .filter((t): t is Template => !!t)
    .map((t) => instantiate(t, 0));
}

const STARTER_POOL_IDS = [
  "faca_enferrujada",
  "luva_couro",
  "moeda_pesada",
  "pocao_vida",
  "pocao_sanidade",
  "olho_falso",
];

export function makeStarterChoices(rng: () => number): Item[] {
  const pool = STARTER_POOL_IDS.slice();
  const out: Item[] = [];
  for (let i = 0; i < 3 && pool.length > 0; i++) {
    const idx = Math.floor(rng() * pool.length);
    const id = pool.splice(idx, 1)[0];
    const t = ALL_ITEMS_TEMPLATES.find((x) => x.id === id);
    if (t) out.push(instantiate(t, 0));
  }
  return out;
}

export function instantiateById(id: string, doorNumber: number): Item | null {
  const t = ALL_ITEMS_TEMPLATES.find((x) => x.id === id);
  return t ? instantiate(t, doorNumber) : null;
}

export const ALL_ITEMS = ALL_ITEMS_TEMPLATES; // backward compat re-export

export function rarityColor(r: Rarity) {
  switch (r) {
    case "Comum":
      return "#c9c4b0";
    case "Raro":
      return "#9bd1ff";
    case "Épico":
      return "#b87fc9";
    case "Divino":
      return "#e6c34a";
  }
}

export function canDiscard(item: Item, currentDoor: number) {
  if (item.curse) return false;
  return currentDoor - item.acquiredAtDoor >= 2;
}
