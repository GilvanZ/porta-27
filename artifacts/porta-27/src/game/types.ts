export type Hint =
  | "PERIGO ALTO"
  | "SALA SEGURA"
  | "EVENTO ESTRANHO"
  | "PRESENCA VIVA"
  | "TESOURO"
  | "FRIO INTENSO"
  | "SONS METALICOS"
  | "SILENCIO ABSOLUTO"
  | "CHEIRO DE FERRO"
  | "LUZ DISTANTE"
  | "MURMURIOS"
  | "??????";

export type RoomKind =
  | "empty"
  | "enemy"
  | "trap"
  | "chest"
  | "puzzle"
  | "npc"
  | "shop"
  | "shrine"
  | "boss"
  | "rare"
  | "shortcut";

export interface Door {
  id: string;
  doorNumber: number; // the number the door advances TO (or skips to)
  hints: Hint[];      // shown to player (vague)
  trueKind: RoomKind; // what's actually behind
  skipAmount: number; // 1 normally, more for shortcuts
  shortcutCost?: number; // hp cost for shortcut doors
}

export interface ItemEffect {
  // Passive modifiers applied each room / each door reveal
  hintClarity?: number;       // +levels of hint clarity (more clear hints)
  difficultyMod?: number;     // +makes rooms harder (% chance bumps)
  lootMod?: number;           // +bonus loot from chests/enemies
  sanityDrainPerRoom?: number;
  hpDrainPerRoom?: number;
  trapResist?: number;        // 0..1 chance to ignore trap dmg
  enemyDmgMod?: number;       // multiplier on enemy damage taken
  rareChanceBonus?: number;   // +flat % to roll rare events
  skipChance?: number;        // chance a door becomes a shortcut
  visionBonus?: boolean;      // shows true kind of one door per choice
  mapBonus?: boolean;         // shows next 5 doors' rough kind
  startHp?: number;
  startSanity?: number;
  maxHpBonus?: number;
  maxSanityBonus?: number;
  goldGainOnDoor?: number;
}

export interface Item {
  id: string;
  name: string;
  glyph: string;
  rarity: "comum" | "incomum" | "raro" | "amaldicoado";
  desc: string;
  upside: string;
  downside?: string;
  effect: ItemEffect;
  tags?: string[]; // for synergy hints
}

export interface FloatingText {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
  born: number;
}

export type Phase = "title" | "doors" | "room" | "gameover" | "victory";

export interface RunState {
  hp: number;
  maxHp: number;
  sanity: number;
  maxSanity: number;
  gold: number;
  doorNumber: number; // current progress (0..100)
  phase: Phase;
  items: Item[];
  doors: Door[];
  log: string[];
  roomResolved: boolean;
  currentRoom: { door: Door; eventIndex: number; data: any } | null;
  bestRun: number;
  totalRuns: number;
  deathCause: string;
  seed: number;
  healGained: number;
  roomsCleared: number;
}
