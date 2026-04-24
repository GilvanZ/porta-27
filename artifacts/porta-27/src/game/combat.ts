import type { CombatState, Item } from "./types";
import type { AggregatedEffects } from "./generate";
import { chance, intBetween, pick } from "./rng";

export function makeEnemyCombat(
  rng: () => number,
  doorNumber: number,
  eff: AggregatedEffects,
  isBoss: boolean
): CombatState {
  const tier = Math.floor(doorNumber / 10) + 1;
  const enemyName = isBoss
    ? doorNumber >= 90
      ? "O Carcereiro"
      : pick(rng, ["O Devorador", "Coisa de Muitos Bracos", "A Mae Faminta", "O Coro"])
    : pick(rng, ["Cao Sem Pelo", "Sombra Lenta", "Coisa Magra", "Boca Quieta", "Vulto Cego"]);
  const baseHp = isBoss ? 12 + tier * 3 : 4 + tier * 2;
  const dmg = (isBoss ? 4 : 2) + tier + Math.round((1 + eff.enemyDmgMod) * 0);
  const finalDmg = Math.max(1, Math.round((isBoss ? 3 + tier : 1 + Math.floor(tier / 2)) * (1 + eff.enemyDmgMod)));
  return {
    enemyName,
    enemyHp: baseHp,
    enemyMaxHp: baseHp,
    enemyDmg: Math.max(1, dmg + finalDmg - dmg),
    defending: false,
    log: [`${enemyName} bloqueia o caminho.`],
    rewardGold: (isBoss ? intBetween(rng, 8, 14) : intBetween(rng, 1, 3)) + Math.floor(eff.lootMod * (isBoss ? 6 : 2)),
    rewardItemChance: isBoss ? 0.7 : 0.18,
    isBoss,
    turn: 1,
  };
}

export function fleeChance(hp: number, maxHp: number, isBoss: boolean): number {
  // Base flee 0.7 scaled by hp ratio; bosses harder
  const ratio = Math.max(0.05, hp / Math.max(1, maxHp));
  const base = isBoss ? 0.45 : 0.7;
  return Math.max(0.05, Math.min(0.95, base * ratio));
}

export function applyArmor(rawDmg: number, eff: AggregatedEffects, defending: boolean): number {
  let red = Math.min(0.75, eff.damageReduction);
  if (defending) red = Math.min(0.9, red + 0.5);
  const enemyMod = 1 + eff.enemyDmgMod;
  const out = Math.max(0, Math.round(rawDmg * enemyMod * (1 - red)));
  return out;
}

export function consumableEffect(item: Item):
  | { type: "heal"; amount: number }
  | { type: "sanity"; amount: number }
  | { type: "smoke" }
  | null {
  switch (item.active) {
    case "pocao_vida":
      return { type: "heal", amount: 4 };
    case "pocao_sanidade":
      return { type: "sanity", amount: 4 };
    case "bomba_fumaca":
      return { type: "smoke" };
    default:
      return null;
  }
}
