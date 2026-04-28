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
  doorNumber: number;
  hints: Hint[];
  trueKind: RoomKind;
  skipAmount: number;
  shortcutCost?: number;
}

export type Rarity = "Comum" | "Raro" | "Épico" | "Divino";
export type EquipSlot = "boots" | "chest" | "helmet" | "weapon";
export type ArmorTier = "couro" | "ouro" | "adamantium" | "encantada";

export type ActiveKind = "olho_vidro" | "totem_tempo" | "pocao_vida" | "pocao_sanidade" | "bomba_fumaca" | "lanterna";

export interface ItemEffect {
  hintClarity?: number;
  difficultyMod?: number;
  lootMod?: number;
  sanityDrainPerRoom?: number;
  hpDrainPerRoom?: number;
  trapResist?: number;
  enemyDmgMod?: number;
  rareChanceBonus?: number;
  skipChance?: number;
  visionBonus?: boolean;
  mapBonus?: boolean;
  startHp?: number;
  startSanity?: number;
  maxHpBonus?: number;
  maxSanityBonus?: number;
  goldGainOnDoor?: number;
  damageReduction?: number;
  attackBonus?: number;
  hpRegenPerRoom?: number;
  falseHints?: number;
}

export interface Item {
  id: string;
  uid: string;
  name: string;
  glyph: string;
  rarity: Rarity;
  desc: string;
  upside: string;
  downside?: string;
  effect: ItemEffect;
  tags?: string[];
  slot?: EquipSlot;
  armorTier?: ArmorTier;
  active?: ActiveKind;
  charges?: number;
  curse?: boolean;
  acquiredAtDoor: number;
  equipped?: boolean;
}

export interface FloatingText {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
  born: number;
}

export type Phase = "title" | "starter-pick" | "doors" | "room" | "combat" | "gameover" | "victory";

export interface CombatState {
  enemyName: string;
  enemyHp: number;
  enemyMaxHp: number;
  enemyDmg: number;
  defending: boolean;
  log: string[];
  rewardGold: number;
  rewardItemChance: number;
  isBoss: boolean;
  turn: number;
  enemyImage?: string;
}

export interface RunState {
  hp: number;
  maxHp: number;
  sanity: number;
  maxSanity: number;
  gold: number;
  doorNumber: number;
  phase: Phase;
  items: Item[];
  doors: Door[];
  log: string[];
  roomResolved: boolean;
  currentRoom: { door: Door; eventIndex: number; data: any } | null;
  combat: CombatState | null;
  bestRun: number;
  totalRuns: number;
  deathCause: string;
  seed: number;
  healGained: number;
  roomsCleared: number;
  visionActive: boolean;
  reviveUsed: boolean;
}
