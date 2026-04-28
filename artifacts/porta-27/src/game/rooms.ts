import type { Door, Item } from "./types";
import { ALL_ITEMS, pickRandomItem } from "./items";
import { chance, intBetween, pick } from "./rng";
import type { AggregatedEffects } from "./generate";

export interface RoomData {
  title: string;
  flavor: string;
  options: RoomOption[];
  art: string; // ascii pixel scene
  accent: string; // tailwind text color
  events?: string[]; // log entries from entering
}

export interface RoomOption {
  label: string;
  resolve: (ctx: RoomCtx) => RoomResolution;
  hidden?: boolean;
  cost?: string;
}

export interface RoomCtx {
  rng: () => number;
  doorNumber: number;
  items: Item[];
  eff: AggregatedEffects;
  hp: number;
  maxHp: number;
  sanity: number;
  maxSanity: number;
  gold: number;
}

export interface RoomResolution {
  hpDelta?: number;
  sanityDelta?: number;
  goldDelta?: number;
  itemGained?: Item | null;
  itemRemovedId?: string;
  itemUsedUid?: string;
  message: string;
  extraDoorAdvance?: number; // additional door progression beyond the door taken
  extraDoorRetreat?: number;
  end?: boolean; // ends room phase
  finishMessage?: string;
}

// ASCII pixel scenes
const ART = {
  empty: `   .  .  ..  .  .  
  .                .
  ┌────────────────┐
  │                │
  │     SILENCIO   │
  │                │
  └────────────────┘
   .  ..  .   .  . `,
  enemy: `      .   .    .  .
   ╲╱╲╱╲      ╱╲╱
   ▓▓▓▓▓▓▓▓▓▓▓▓▓
   ▓ ◉   ◉    ▓
   ▓   ▼       ▓
   ▓ ▓▓▓▓▓     ▓
   ▓▓▓▓▓▓▓▓▓▓▓▓▓
        ╱  ╲`,
  chest: `        .  ✦   .
       ╔═══════╗
       ║ ◆ ◆ ◆ ║
       ║───────║
       ║   ◎   ║
       ╚═══════╝
        ╲   ╱  
       ░░░░░░░`,
  trap: `   .  .  .  .  .
  ▼▼▼▼▼▼▼▼▼▼▼▼▼
  │ │ │ │ │ │ │
  ─ ─ ─ ─ ─ ─ ─
  │ │ ▓ │ │ │ │
  ▲▲▲▲▲▲▲▲▲▲▲▲▲`,
  puzzle: `      ┌─────────┐
      │ ◇  ◯  ◊ │
      │         │
      │ ?  ?  ? │
      │         │
      └─────────┘`,
  npc: `        .   .
        ╭───╮
        │•_•│
        ╰─┬─╯
         /│\\
         / \\
        ░░░░░`,
  shop: `   ╔═══════════════╗
   ║ ✦  L O J A  ✦ ║
   ╠═══════════════╣
   ║  ▲   ◎   ◇   ║
   ║  $   $   $   ║
   ╚═══════════════╝`,
  shrine: `         ┌─┐
         │✦│
        ┌┴─┴┐
        │ ◯ │
       ┌┴───┴┐
       │     │
       └─────┘`,
  boss: `   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   ▓▓ ◉◉    ◉◉ ▓▓
   ▓▓             ▓▓
   ▓▓   ▼▼▼▼▼▼   ▓▓
   ▓▓             ▓▓
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
       ╲    ╱
       ╲╲  ╱╱`,
  rare: `      ✦  .  ✦  .  ✦
       ╱╲  ╱╲  ╱╲
      ╱  ╲╱  ╲╱  ╲
      ╲  ╱╲  ╱╲  ╱
       ╲╱  ╲╱  ╲╱
      ✦  .  ✦  .  ✦`,
  shortcut: `   ─────────────────
   ─►    ►►   ►►►
   ─────────────────
       PORTAS
     COMPRIMIDAS`,
};

function clampDmg(base: number, eff: AggregatedEffects) {
  const mod = 1 + eff.enemyDmgMod;
  const red = Math.min(0.85, eff.damageReduction);
  const final = Math.max(0, Math.round(base * mod * (1 - red)));
  return final;
}

export function buildRoom(door: Door, ctx: RoomCtx): RoomData {
  const { rng, items, eff } = ctx;

  switch (door.trueKind) {
    case "empty": {
      const drainHp = chance(rng, 0.15) ? 1 : 0;
      return {
        title: "Sala Vazia",
        flavor: pick(rng, [
          "O corredor morreu em silencio. Apenas a sua respiração responde.",
          "A poeira cai lento no escuro. A luz do seu lampião é o único movimento.",
          "Uma quietude pesada toma o espaço. Parece que algo observa sem fazer barulho.",
        ]),
        accent: "text-ink",
        art: ART.empty,
        options: [
          {
            label: "Atravessar em silencio",
            resolve: () => ({
              hpDelta: -drainHp,
              sanityDelta: chance(rng, 0.2) ? -1 : 0,
              message:
                drainHp > 0
                  ? "Algo te toca na escuridao. (-1 vida)"
                  : "Voce atravessa sem incidentes.",
              end: true,
            }),
          },
          ...(items.some((i) => i.active === "lanterna")
            ? [
                {
                  label: "Usar Lanterna",
                  resolve: () => {
                    const hasGold = chance(rng, 0.6);
                    if (hasGold) {
                      const g = intBetween(rng, 1, 4);
                      return {
                        goldDelta: g,
                        message: `Lanterna: ha moedas no canto da sala. (+${g} moedas)`,
                        itemUsedUid: items.find((i) => i.active === "lanterna")?.uid,
                        end: true,
                      };
                    }
                    const it = pickRandomItem(rng, ctx.doorNumber, items.map((i) => i.id));
                    return {
                      itemGained: it,
                      message: `Lanterna: voce ve um item no chao. (${it.name})`,
                      itemUsedUid: items.find((i) => i.active === "lanterna")?.uid,
                      end: true,
                    };
                  },
                },
              ]
            : []),
          {
            label: "Procurar nos cantos",
            resolve: () => {
              if (chance(rng, 0.35)) {
                const g = intBetween(rng, 1, 3);
                return { goldDelta: g, message: `Voce encontra ${g} moedas.`, end: true };
              }
              if (chance(rng, 0.1)) {
                const it = pickRandomItem(rng, ctx.doorNumber, items.map((i) => i.id));
                return { itemGained: it, message: `Embrulhado em panos: ${it.name}.`, end: true };
              }
              return { sanityDelta: -1, message: "Nada. So o vazio te encarando. (-1 sanidade)", end: true };
            },
          },
        ],
      };
    }

    case "enemy": {
      const tier = Math.floor(ctx.doorNumber / 10) + 1;
      const enemyName = pick(rng, ["Cao Sem Pelo", "Sombra Lenta", "Coisa Magra", "Boca Quieta", "Vulto Cego"]);
      const hpDmg = clampDmg(intBetween(rng, 1 + tier, 3 + tier), eff);
      const sanityDmg = chance(rng, 0.4) ? 1 : 0;
      return {
        title: enemyName,
        flavor: "Algo se mexe alem da fresta. Te viu primeiro.",
        accent: "text-blood",
        art: ART.enemy,
        options: [
          {
            label: "Lutar",
            resolve: () => {
              const took = clampDmg(hpDmg, eff);
              if (chance(rng, 0.65)) {
                const g = intBetween(rng, 1, 3) + Math.floor(eff.lootMod * 2);
                return {
                  hpDelta: -took,
                  sanityDelta: -sanityDmg,
                  goldDelta: g,
                  message: `Voce abate ${enemyName}. (-${took} vida, +${g} ouro)`,
                  end: true,
                };
              }
              return {
                hpDelta: -took - 1,
                sanityDelta: -sanityDmg - 1,
                message: `Encontro brutal. Voce escapa ferido. (-${took + 1} vida)`,
                end: true,
              };
            },
          },
          {
            label: "Tentar fugir",
            resolve: () => {
              if (chance(rng, 0.55)) {
                return { sanityDelta: -1, message: "Voce escapa por pouco. (-1 sanidade)", end: true };
              }
              const took = clampDmg(hpDmg + 1, eff);
              return { hpDelta: -took, sanityDelta: -1, message: `Te alcancou. (-${took} vida)`, end: true };
            },
          },
        ],
      };
    }

    case "trap": {
      const tier = Math.floor(ctx.doorNumber / 10) + 1;
      const baseDmg = intBetween(rng, 2, 4) + tier;
      return {
        title: "Armadilha",
        flavor: "Algo na pedra esta um pouco alto demais.",
        accent: "text-ember",
        art: ART.trap,
        options: [
          {
            label: "Avancar com cuidado",
            resolve: () => {
              if (chance(rng, eff.trapResist + 0.15)) {
                return { message: "Voce desvia. Foi por pouco.", end: true };
              }
              const final = clampDmg(baseDmg, eff);
              return { hpDelta: -final, message: `Disparou. (-${final} vida)`, end: true };
            },
          },
          {
            label: "Tentar desarmar",
            resolve: () => {
              if (chance(rng, 0.45 + eff.trapResist * 0.5)) {
                const g = intBetween(rng, 2, 5);
                return { goldDelta: g, message: `Desarmada. Voce pega ${g} moedas escondidas.`, end: true };
              }
              const final = clampDmg(baseDmg + 1, eff);
              return { hpDelta: -final, sanityDelta: -1, message: `Errou. (-${final} vida, -1 sanidade)`, end: true };
            },
          },
        ],
      };
    }

    case "chest": {
      const hasLeverTool = items.some((i) => i.active === "pe_de_cabra");
      const leverItemUid = items.find((i) => i.active === "pe_de_cabra")?.uid;
      return {
        title: "Bau Empoeirado",
        flavor: pick(rng, [
          "A tampa range como se algo mais pesado estivesse preso dentro.",
          "O bau parece antigo demais para ser aberto sem cuidado.",
          "Uma trava enferrujada guarda o tesouro, mas tambem perigo.",
        ]),
        accent: "text-gold",
        art: ART.chest,
        options: [
          ...(hasLeverTool ? [{
            label: "Usar Pe de Cabra",
            resolve: () => {
              const it = pickRandomItem(rng, ctx.doorNumber, items.map((i) => i.id));
              const g = intBetween(rng, 5, 10) + Math.floor(eff.lootMod * 6);
              return {
                itemGained: it,
                goldDelta: g,
                itemUsedUid: leverItemUid,
                message: `Bau aberto com precisao! ${it.name} + ${g} moedas. (Pe de Cabra consumido)`,
                end: true,
              };
            },
          }] : []),
          {
            label: "Abrir",
            resolve: () => {
              if (chance(rng, 0.15)) {
                const dmg = intBetween(rng, 2, 4);
                return { hpDelta: -dmg, message: `Bau preso! (-${dmg} vida)`, end: true };
              }
              if (chance(rng, 0.35)) {
                const it = pickRandomItem(rng, ctx.doorNumber, items.map((i) => i.id));
                const g = intBetween(rng, 0, 2);
                return { itemGained: it, goldDelta: g, message: `Voce pega: ${it.name}.`, end: true };
              }
              const g = intBetween(rng, 3, 7) + Math.floor(eff.lootMod * 4);
              return { goldDelta: g, message: `+${g} moedas.`, end: true };
            },
          },
          {
            label: "Forcar com cuidado",
            resolve: () => {
              if (chance(rng, 0.7)) {
                const g = intBetween(rng, 4, 8) + Math.floor(eff.lootMod * 4);
                return { goldDelta: g, message: `Voce abre devagar. +${g} moedas.`, end: true };
              }
              return { sanityDelta: -1, message: "Travou. So um cheiro estranho saiu.", end: true };
            },
          },
        ],
      };
    }

    case "puzzle": {
      const a = intBetween(rng, 2, 9);
      const b = intBetween(rng, 2, 9);
      const op = pick(rng, ["+", "-", "×"]);
      const correct = op === "+" ? a + b : op === "-" ? a - b : a * b;
      const wrongs = new Set<number>();
      while (wrongs.size < 2) {
        const w = correct + intBetween(rng, -5, 5);
        if (w !== correct) wrongs.add(w);
      }
      const choices = [correct, ...Array.from(wrongs)].sort(() => rng() - 0.5);
      return {
        title: "Inscricao na Parede",
        flavor: `Marcas talhadas formam: ${a} ${op} ${b} = ?`,
        accent: "text-mind",
        art: ART.puzzle,
        options: choices.map((c) => ({
          label: `Responder ${c}`,
          resolve: () => {
            if (c === correct) {
              if (chance(rng, 0.4)) {
                const skip = intBetween(rng, 1, 3);
                return {
                  extraDoorAdvance: skip,
                  message: `Correto. A parede te empurra ${skip} portas adiante.`,
                  end: true,
                };
              }
              const g = intBetween(rng, 2, 5);
              return { goldDelta: g, message: `Correto. +${g} moedas escorrem da parede.`, end: true };
            } else {
              if (chance(rng, 0.5)) {
                const back = intBetween(rng, 1, 3);
                return {
                  extraDoorRetreat: back,
                  sanityDelta: -1,
                  message: `Errado. O corredor te puxa ${back} portas atras.`,
                  end: true,
                };
              }
              const dmg = intBetween(rng, 1, 3);
              return { hpDelta: -dmg, sanityDelta: -1, message: `Errado. (-${dmg} vida)`, end: true };
            }
          },
        })),
      };
    }

    case "npc": {
      const liesChance = 0.35;
      const truthful = !chance(rng, liesChance);
      const npcs = ["O Velho Sem Rosto", "Mulher de Lampião", "Crianca Que Nao Pisca", "O Vendedor"];
      const name = pick(rng, npcs);
      return {
        title: name,
        flavor: '"Eu posso te ajudar... talvez."',
        accent: "text-mind-bright",
        art: ART.npc,
        options: [
          {
            label: "Aceitar a benção (-3 vida)",
            resolve: () => {
              if (truthful) {
                return {
                  hpDelta: -3,
                  sanityDelta: 3,
                  message: `${name} te abencoa. (-3 vida, +3 sanidade)`,
                  end: true,
                };
              }
              return {
                hpDelta: -5,
                sanityDelta: -2,
                message: `Mentira. (-5 vida, -2 sanidade)`,
                end: true,
              };
            },
          },
          {
            label: "Aceitar o presente (-3 sanidade)",
            resolve: () => {
              if (truthful) {
                const it = pickRandomItem(rng, ctx.doorNumber, items.map((i) => i.id));
                return {
                  sanityDelta: -3,
                  itemGained: it,
                  message: `${name} te entrega: ${it.name}. (-3 sanidade)`,
                  end: true,
                };
              }
              return { sanityDelta: -4, message: "Mentira. Nada veio. (-4 sanidade)", end: true };
            },
          },
          {
            label: "Ignorar e seguir",
            resolve: () => ({ message: `${name} te observa em silencio.`, end: true }),
          },
        ],
      };
    }

    case "shop": {
      const cost1 = intBetween(rng, 5, 9);
      const cost2 = intBetween(rng, 6, 12);
      const item = pickRandomItem(rng, ctx.doorNumber, items.map((i) => i.id));
      return {
        title: "Mercador no Escuro",
        flavor: '"Aceito ouro. Aceito silencio. Aceito ambos."',
        accent: "text-gold",
        art: ART.shop,
        options: [
          {
            label: `Comprar +5 vida (${cost1} ouro)`,
            cost: `${cost1}`,
            resolve: (c) => {
              if (c.gold < cost1) return { message: "Ouro insuficiente.", end: false };
              return {
                goldDelta: -cost1,
                hpDelta: 5,
                message: `+5 vida.`,
                end: true,
              };
            },
          },
          {
            label: `Comprar ${item.name} (${cost2} ouro)`,
            cost: `${cost2}`,
            resolve: (c) => {
              if (c.gold < cost2) return { message: "Ouro insuficiente.", end: false };
              return {
                goldDelta: -cost2,
                itemGained: item,
                message: `Voce compra ${item.name}.`,
                end: true,
              };
            },
          },
          {
            label: "Sair sem comprar",
            resolve: () => ({ message: "Voce segue.", end: true }),
          },
        ],
      };
    }

    case "shrine": {
      return {
        title: "Pequeno Altar",
        flavor: "Pedras empilhadas com cuidado. Algo respira embaixo.",
        accent: "text-mind-bright",
        art: ART.shrine,
        options: [
          {
            label: "Oferecer 5 ouro",
            cost: "5",
            resolve: (c) => {
              if (c.gold < 5) return { message: "Pouco ouro pra ofertar.", end: false };
              const heal = intBetween(rng, 4, 7);
              const san = intBetween(rng, 2, 4);
              return {
                goldDelta: -5,
                hpDelta: heal,
                sanityDelta: san,
                message: `Voce sente alivio. (+${heal} vida, +${san} sanidade)`,
                end: true,
              };
            },
          },
          {
            label: "Quebrar o altar",
            resolve: () => {
              if (chance(rng, 0.4)) {
                const it = pickRandomItem(rng, ctx.doorNumber, items.map((i) => i.id));
                return {
                  sanityDelta: -3,
                  itemGained: it,
                  message: `Algo cai entre as pedras: ${it.name}. (-3 sanidade)`,
                  end: true,
                };
              }
              return { hpDelta: -3, sanityDelta: -3, message: "Voce ofende o que dorme. (-3/-3)", end: true };
            },
          },
          {
            label: "Apenas observar",
            resolve: () => ({ sanityDelta: 1, message: "Voce respira fundo. (+1 sanidade)", end: true }),
          },
        ],
      };
    }

    case "boss": {
      const tier = Math.floor(ctx.doorNumber / 10) + 1;
      const dmg = clampDmg(intBetween(rng, 4, 6) + tier, eff);
      const bossName = ctx.doorNumber >= 90 ? "O Carcereiro" : pick(rng, ["O Devorador", "Coisa de Muitos Bracos", "A Mae Faminta", "O Coro"]);
      return {
        title: bossName,
        flavor: "Voce sente que essa porta era melhor nao ter aberto.",
        accent: "text-blood",
        art: ART.boss,
        options: [
          {
            label: "Enfrentar de frente",
            resolve: () => {
              if (chance(rng, 0.55)) {
                const g = intBetween(rng, 8, 14) + Math.floor(eff.lootMod * 6);
                const it = chance(rng, 0.6) ? pickRandomItem(rng, ctx.doorNumber, items.map((i) => i.id)) : null;
                return {
                  hpDelta: -dmg,
                  sanityDelta: -2,
                  goldDelta: g,
                  itemGained: it,
                  message: `${bossName} cai. (-${dmg} vida, +${g} ouro${it ? `, +${it.name}` : ""})`,
                  end: true,
                };
              }
              return {
                hpDelta: -dmg - 3,
                sanityDelta: -3,
                message: `Quase morre. (-${dmg + 3} vida, -3 sanidade)`,
                end: true,
              };
            },
          },
          {
            label: "Fugir pelas frestas",
            resolve: () => {
              if (chance(rng, 0.4)) {
                return { sanityDelta: -2, message: "Voce escorrega entre as paredes. (-2 sanidade)", end: true };
              }
              return {
                hpDelta: -dmg - 2,
                sanityDelta: -3,
                message: `Te puxou pelos calcanhares. (-${dmg + 2} vida)`,
                end: true,
              };
            },
          },
        ],
      };
    }

    case "rare": {
      const which = intBetween(rng, 0, 2);
      if (which === 0) {
        return {
          title: "Porta Numero 0",
          flavor: "Uma porta sem numero te observa de volta. Voce ouve seu proprio nome do outro lado.",
          accent: "text-rare",
          art: ART.rare,
          options: [
            {
              label: "Atender",
              resolve: () => {
                const heal = intBetween(rng, 6, 12);
                return {
                  hpDelta: heal,
                  sanityDelta: -4,
                  message: `Algo sussurra e te cura. (+${heal} vida, -4 sanidade)`,
                  end: true,
                };
              },
            },
            {
              label: "Ir embora correndo",
              resolve: () => {
                const skip = intBetween(rng, 5, 12);
                return {
                  extraDoorAdvance: skip,
                  sanityDelta: -2,
                  message: `Voce corre. O corredor te empurra ${skip} portas. (-2 sanidade)`,
                  end: true,
                };
              },
            },
          ],
        };
      } else if (which === 1) {
        // free legendary item
        const it = pickRandomItem(rng, ctx.doorNumber, items.map((i) => i.id));
        return {
          title: "Vitrine Sob a Poeira",
          flavor: "Um pedestal frio segura algo brilhante.",
          accent: "text-rare",
          art: ART.rare,
          options: [
            {
              label: `Pegar ${it.name}`,
              resolve: () => ({ itemGained: it, message: `Voce leva: ${it.name}.`, end: true }),
            },
            {
              label: "Deixar onde esta",
              resolve: () => ({ sanityDelta: 2, message: "Voce respira fundo. (+2 sanidade)", end: true }),
            },
          ],
        };
      } else {
        // refill
        return {
          title: "Quarto de Hospede",
          flavor: "Uma cama feita. Agua na mesa. Tudo em ordem demais.",
          accent: "text-rare",
          art: ART.rare,
          options: [
            {
              label: "Descansar",
              resolve: (c) => ({
                hpDelta: c.maxHp,
                sanityDelta: c.maxSanity,
                message: "Voce dorme. Acorda inteiro.",
                end: true,
              }),
            },
            {
              label: "Sair sem encostar",
              resolve: () => ({ sanityDelta: 1, message: "Voce desconfia. Boa.", end: true }),
            },
          ],
        };
      }
    }

    case "shortcut": {
      const cost = door.shortcutCost ?? 2;
      return {
        title: "Atalho Apertado",
        flavor: `Um corredor comprime ${door.skipAmount} portas em uma so. Pode cobrar ${cost} de vida, mas talvez seja rapido demais para ferir.
`,
        accent: "text-ember",
        art: ART.shortcut,
        options: [
          {
            label: "Forcar o atalho",
            resolve: () => {
              if (chance(rng, 0.45 + (eff.skipChance ?? 0) * 0.25)) {
                return { message: "Voce atravessa sem ferimentos.", end: true };
              }
              return { hpDelta: -cost, message: `O corredor corta voce. (-${cost} vida)`, end: true };
            },
          },
          {
            label: "Voltar e tentar outra porta",
            resolve: () => ({
              extraDoorRetreat: Math.max(0, door.skipAmount - 1),
              sanityDelta: -1,
              message: "Voce volta. O corredor reembaralha.",
              end: true,
            }),
          },
        ],
      };
    }
  }
}

// ensure ALL_ITEMS is referenced for tree-shaking insurance
export const _itemsRef = ALL_ITEMS;
