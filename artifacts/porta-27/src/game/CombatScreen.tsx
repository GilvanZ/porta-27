import { useEffect, useMemo, useRef, useState } from "react";
import type { CombatState, Item } from "./types";
import { applyArmor, consumableEffect, fleeChance } from "./combat";
import type { AggregatedEffects } from "./generate";
import { intBetween } from "./rng";
import { sfx } from "./audio";
import { rarityColor } from "./items";

export interface CombatAction {
  type: "playerAttack" | "playerDefend" | "useItem" | "flee" | "victory" | "lose";
  enemyHpDelta?: number;
  playerHpDelta?: number;
  playerSanityDelta?: number;
  goldDelta?: number;
  itemUsedUid?: string;
  itemGainedFromVictory?: boolean;
  message: string;
  endCombat?: "win" | "lose" | "fled" | null;
}

export function CombatScreen({
  combat,
  eff,
  items,
  hp,
  maxHp,
  onAction,
  onContinue,
  resolved,
}: {
  combat: CombatState;
  eff: AggregatedEffects;
  items: Item[];
  hp: number;
  maxHp: number;
  onAction: (a: CombatAction) => void;
  onContinue: () => void;
  resolved: boolean;
}) {
  const [showItems, setShowItems] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  // Reset waiting if combat resolves (won/fled/died)
  useEffect(() => {
    if (resolved) {
      setWaiting(false);
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [resolved]);

  const usableItems = useMemo(
    () => items.filter((i) => i.active && i.active !== "totem_tempo" && i.active !== "olho_vidro"),
    [items]
  );

  const playerAtk = 2 + eff.attackBonus;
  const flee = fleeChance(hp, maxHp, combat.isBoss);

  const doAttack = () => {
    if (waiting) return;
    const dmg = Math.max(1, playerAtk + intBetween(Math.random, 0, 2));
    const newEnemyHp = Math.max(0, combat.enemyHp - dmg);
    sfx.hit();
    if (newEnemyHp <= 0) {
      const reward = combat.rewardGold;
      sfx.coin();
      onAction({
        type: "victory",
        enemyHpDelta: -dmg,
        goldDelta: reward,
        itemGainedFromVictory: Math.random() < combat.rewardItemChance,
        message: `Voce derrota ${combat.enemyName}. (+${reward} ouro)`,
        endCombat: "win",
      });
      return;
    }
    // Player hit only — enemy counter delayed
    onAction({
      type: "playerAttack",
      enemyHpDelta: -dmg,
      message: `Voce acerta ${dmg} em ${combat.enemyName}.`,
    });
    setWaiting(true);
    timerRef.current = window.setTimeout(() => {
      const raw = combat.enemyDmg + intBetween(Math.random, 0, 1);
      const took = applyArmor(raw, eff, false);
      if (took > 0) sfx.hit();
      onAction({
        type: "playerAttack",
        playerHpDelta: -took,
        message: took > 0 ? `${combat.enemyName} contra-ataca (-${took} vida).` : `${combat.enemyName} erra o golpe.`,
      });
      setWaiting(false);
      timerRef.current = null;
    }, 2500);
  };

  const doDefend = () => {
    const raw = combat.enemyDmg + intBetween(Math.random, 0, 1);
    const took = applyArmor(raw, eff, true);
    onAction({
      type: "playerDefend",
      playerHpDelta: -took,
      message: took > 0 ? `Voce se protege. (-${took} vida)` : `Voce bloqueia o golpe.`,
    });
  };

  const doFlee = () => {
    if (Math.random() < flee) {
      onAction({
        type: "flee",
        playerSanityDelta: -1,
        message: "Voce escapa entre as sombras. (-1 sanidade)",
        endCombat: "fled",
      });
    } else {
      const raw = combat.enemyDmg + 1;
      const took = applyArmor(raw, eff, false);
      sfx.hit();
      onAction({
        type: "flee",
        playerHpDelta: -took,
        playerSanityDelta: -1,
        message: `Falhou. Te alcancou. (-${took} vida, -1 sanidade)`,
      });
    }
  };

  const doUseItem = (item: Item) => {
    const cef = consumableEffect(item);
    if (!cef) return;
    setShowItems(false);
    if (cef.type === "heal") {
      sfx.heal();
      onAction({
        type: "useItem",
        playerHpDelta: cef.amount,
        itemUsedUid: item.uid,
        message: `Voce bebe ${item.name}. (+${cef.amount} vida)`,
      });
    } else if (cef.type === "sanity") {
      onAction({
        type: "useItem",
        playerSanityDelta: cef.amount,
        itemUsedUid: item.uid,
        message: `Voce bebe ${item.name}. (+${cef.amount} sanidade)`,
      });
    } else if (cef.type === "smoke") {
      onAction({
        type: "useItem",
        itemUsedUid: item.uid,
        message: `Voce explode ${item.name} e foge na fumaca.`,
        endCombat: "fled",
      });
    }
  };

  return (
    <div className="relative min-h-full flex flex-col items-center justify-start py-2 px-2 overflow-hidden">
      <div className={`relative z-10 text-[12px] sm:text-[14px] tracking-[0.3em] text-blood text-shadow-hard text-center`}>
        {combat.isBoss ? "CHEFE — " : "COMBATE — "}{combat.enemyName.toUpperCase()}
      </div>
      <div className="text-[9px] text-ink-dim mt-1 italic">Turno {combat.turn}</div>

      {/* Enemy bar */}
      <div className="mt-3 flex items-center gap-3 text-[10px] text-ink">
        <span className="text-blood">{combat.enemyName}</span>
        <div className="flex gap-[2px]" style={{ filter: "drop-shadow(0 0 4px #d97a2a40)" }}>
          {Array.from({ length: combat.enemyMaxHp }).map((_, i) => (
            <div
              key={i}
              className="h-3"
              style={{
                width: 6,
                background: i < combat.enemyHp ? "#8b1a1a" : "#1a1d28",
                border: `1px solid ${i < combat.enemyHp ? "#d97a2a" : "#2a2d38"}`,
              }}
            />
          ))}
        </div>
        <span className="text-ink-dim">{combat.enemyHp}/{combat.enemyMaxHp}</span>
      </div>

      <pre className="relative z-10 mt-3 text-[10px] sm:text-[12px] text-blood text-shadow-hard">
{`     ╲╱╲╱╲      ╱╲╱
   ▓▓▓▓▓▓▓▓▓▓▓▓▓
   ▓ ◉   ◉ ▓
   ▓   ▼   ▓
   ▓ ▓▓▓▓▓ ▓
   ▓▓▓▓▓▓▓▓▓▓▓▓▓`}
      </pre>

      {/* Combat log (last 3) */}
      <div className="mt-3 text-[9px] text-ink-dim italic max-w-[500px] text-center px-2">
        {combat.log.slice(-3).map((l, i) => (
          <div key={i} className={i === combat.log.slice(-3).length - 1 ? "text-ink" : ""}>
            {">"} {l}
          </div>
        ))}
      </div>

      {resolved ? (
        <div className="relative z-10 mt-4 flex flex-col items-center gap-3 w-full">
          <button
            onClick={onContinue}
            className="text-[11px] px-6 py-3 border-2 border-ember text-ember-bright hover:bg-ember hover:text-bg transition-colors min-h-[44px]"
          >
            CONTINUAR ►
          </button>
        </div>
      ) : waiting ? (
        <div className="relative z-10 mt-4 flex flex-col items-center gap-2">
          <div className="text-[10px] text-blood tracking-[0.3em] flicker">
            {combat.enemyName.toUpperCase()} SE PREPARA...
          </div>
          <div className="flex gap-1">
            <span className="text-blood animate-pulse">●</span>
            <span className="text-blood animate-pulse" style={{ animationDelay: "0.2s" }}>●</span>
            <span className="text-blood animate-pulse" style={{ animationDelay: "0.4s" }}>●</span>
          </div>
        </div>
      ) : showItems ? (
        <div className="relative z-10 mt-4 flex flex-col gap-2 items-stretch w-full max-w-[420px]">
          <div className="text-[9px] text-ink-dim mb-1 tracking-wider">USAR ITEM</div>
          {usableItems.length === 0 ? (
            <div className="text-[9px] text-ink-dim italic">Nenhum item utilizavel.</div>
          ) : (
            usableItems.map((it) => (
              <button
                key={it.uid}
                onClick={() => doUseItem(it)}
                className="text-[10px] px-3 py-2 border border-ink-dim hover:border-ember-bright text-ink hover:text-ember-bright transition-colors text-left flex gap-2 items-center min-h-[40px]"
              >
                <span style={{ color: rarityColor(it.rarity) }}>{it.glyph}</span>
                <span>{it.name}</span>
                <span className="text-[8px] text-ink-dim ml-auto">[{it.rarity}]</span>
              </button>
            ))
          )}
          <button
            onClick={() => setShowItems(false)}
            className="text-[9px] mt-2 text-ink-dim hover:text-ember-bright"
          >
            voltar
          </button>
        </div>
      ) : (
        <div className="relative z-10 mt-4 grid grid-cols-2 gap-2 w-full max-w-[420px]">
          <button
            onClick={doAttack}
            className="text-[10px] px-3 py-3 border border-blood hover:bg-blood/20 text-blood hover:text-ember-bright transition-colors min-h-[44px]"
          >
            ⚔ ATACAR <span className="text-[8px] text-ink-dim">({playerAtk})</span>
          </button>
          <button
            onClick={doDefend}
            className="text-[10px] px-3 py-3 border border-mind hover:bg-mind/20 text-mind hover:text-mind-bright transition-colors min-h-[44px]"
          >
            ▣ DEFENDER
          </button>
          <button
            onClick={() => setShowItems(true)}
            disabled={usableItems.length === 0}
            className="text-[10px] px-3 py-3 border border-ember disabled:border-ink-dim disabled:text-ink-dim hover:bg-ember/20 text-ember hover:text-ember-bright transition-colors min-h-[44px]"
          >
            ◎ USAR ITEM <span className="text-[8px]">({usableItems.length})</span>
          </button>
          <button
            onClick={doFlee}
            className="text-[10px] px-3 py-3 border border-ink-dim hover:border-ember-bright text-ink hover:text-ember-bright transition-colors min-h-[44px]"
          >
            → FUGIR <span className="text-[8px] text-ink-dim">({Math.round(flee * 100)}%)</span>
          </button>
        </div>
      )}
    </div>
  );
}
