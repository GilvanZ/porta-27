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
  const [combatPhase, setCombatPhase] = useState<"idle" | "playerDelay" | "enemyDelay" | "playerDamageDelay" | "playerDamageAnim" | "resolved">("idle");
  const [displayEnemyHp, setDisplayEnemyHp] = useState(combat.enemyHp);
  const [displayPlayerHp, setDisplayPlayerHp] = useState(hp);
  const [actionLabel, setActionLabel] = useState<string | null>(null);
  const [damageLabel, setDamageLabel] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (resolved) {
      setCombatPhase("resolved");
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [resolved]);

  useEffect(() => {
    if (resolved) return;
    clearTimers();
    setCombatPhase("idle");
    setDisplayEnemyHp(combat.enemyHp);
    setDisplayPlayerHp(hp);
    setActionLabel(null);
    setDamageLabel(null);
  }, [combat.enemyName, combat.enemyMaxHp, resolved]);

  useEffect(() => {
    if (combatPhase === "idle") {
      setDisplayEnemyHp(combat.enemyHp);
      setDisplayPlayerHp(hp);
    }
  }, [combat.enemyHp, hp, combatPhase]);

  useEffect(() => {
    if (combat.enemyHp !== displayEnemyHp && combatPhase === "idle") {
      setDisplayEnemyHp(combat.enemyHp);
    }
  }, [combat.enemyHp, displayEnemyHp, combatPhase]);

  const usableItems = useMemo(
    () => items.filter((i) => i.active && i.active !== "totem_tempo" && i.active !== "olho_vidro" && i.active !== "lanterna"),
    [items]
  );

  const playerAtk = 2 + eff.attackBonus;
  const flee = fleeChance(hp, maxHp, combat.isBoss);
  const busy = combatPhase !== "idle" && combatPhase !== "resolved";

  function clearTimers() {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  const animateHpChange = (
    from: number,
    to: number,
    setter: (value: number) => void,
    onComplete: () => void
  ) => {
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    const delta = from > to ? -1 : 1;
    let value = from;
    if (from === to) {
      onComplete();
      return;
    }
    intervalRef.current = window.setInterval(() => {
      value += delta;
      setter(value);
      if ((delta < 0 && value <= to) || (delta > 0 && value >= to)) {
        if (intervalRef.current) window.clearInterval(intervalRef.current);
        intervalRef.current = null;
        onComplete();
      }
    }, 150);
  };

  const scheduleEnemyAttack = (attackDelay: number, took: number, message: string) => {
    setCombatPhase("enemyDelay");
    timerRef.current = window.setTimeout(() => {
      setActionLabel(`${combat.enemyName.toUpperCase()} ataca...`);
      setCombatPhase("playerDamageDelay");
      timerRef.current = window.setTimeout(() => {
        setDamageLabel(took > 0 ? `-${took}` : null);
        setCombatPhase("playerDamageAnim");
        animateHpChange(displayPlayerHp, Math.max(0, hp - took), setDisplayPlayerHp, () => {
          onAction({
            type: "playerAttack",
            playerHpDelta: took > 0 ? -took : 0,
            message,
          });
          setDamageLabel(null);
          setActionLabel(null);
          setCombatPhase("idle");
        });
      }, 2000);
    }, attackDelay);
  };

  const schedulePlayerAction = (
    action: CombatAction,
    enemyDamage?: number,
    shouldScheduleEnemyAttack = true,
    enemyAttackMessage?: string
  ) => {
    setCombatPhase("playerDelay");
    setActionLabel("Voce age...");
    timerRef.current = window.setTimeout(() => {
      onAction(action);
      setDamageLabel(action.enemyHpDelta ? `${action.enemyHpDelta}` : null);
      const enemyAlive = combat.enemyHp + (action.enemyHpDelta ?? 0) > 0;
      const willEndCombat = action.endCombat === "win" || action.endCombat === "fled";

      if (enemyAlive && shouldScheduleEnemyAttack && !willEndCombat) {
        const newEnemyHp = Math.max(0, combat.enemyHp + (action.enemyHpDelta ?? 0));
        
        animateHpChange(displayEnemyHp, newEnemyHp, setDisplayEnemyHp, () => {
          setDamageLabel(null);
          setActionLabel(null);
          scheduleEnemyAttack(
            2000,
            enemyDamage ?? 0,
            enemyAttackMessage ?? `${combat.enemyName} contra-ataca (-${enemyDamage ?? 0} vida).`
          );
        });
      } else {
        setDamageLabel(null);
        setActionLabel(null);
        setCombatPhase(willEndCombat || !enemyAlive ? "resolved" : "idle");
      }
    }, 2000);
  };

  const doAttack = () => {
    if (busy || resolved) return;
    const dmg = Math.max(1, playerAtk + intBetween(Math.random, 0, 2));
    const raw = combat.enemyDmg + intBetween(Math.random, 0, 1);
    const took = applyArmor(raw, eff, false);
    schedulePlayerAction(
      {
        type: "playerAttack",
        enemyHpDelta: -dmg,
        message: `Voce acerta ${dmg} em ${combat.enemyName}.`,
      },
      took
    );
    if (dmg > 0) sfx.hit();
  };

  const doDefend = () => {
    if (busy || resolved) return;
    const raw = combat.enemyDmg + intBetween(Math.random, 0, 1);
    const blocked = Math.random() < 0.5;
    const took = blocked ? 0 : applyArmor(raw, eff, true);
    
    // Chance de contra-ataque (30%)
    const counterAttack = Math.random() < 0.3;
    const counterDmg = counterAttack ? Math.max(1, Math.floor(playerAtk * 0.7)) : 0;
    
    schedulePlayerAction(
      {
        type: "playerDefend",
        message: counterAttack 
          ? `Voce se defende e contra-ataca! (+${counterDmg} dano)`
          : "Voce se prepara para defender.",
        enemyHpDelta: counterAttack ? -counterDmg : undefined,
      },
      took,
      true,
      took > 0
        ? `${combat.enemyName} contra-ataca (-${took} vida).`
        : `${combat.enemyName} ataca e voce bloqueia o golpe.`
    );
  };

  const doFlee = () => {
    if (busy || resolved) return;
    const success = Math.random() < flee;
    if (success) {
      schedulePlayerAction({
        type: "flee",
        playerSanityDelta: -1,
        message: "Voce escapa entre as sombras. (-1 sanidade)",
        endCombat: "fled",
      });
      return;
    }
    const raw = combat.enemyDmg + 1;
    const took = applyArmor(raw, eff, false);
    schedulePlayerAction(
      {
        type: "flee",
        playerHpDelta: -took,
        playerSanityDelta: -1,
        message: `Falhou. Te alcancou. (-${took} vida, -1 sanidade)`,
      },
      0,
      false
    );
  };

  const doUseItem = (item: Item) => {
    if (busy || resolved) return;
    const cef = consumableEffect(item);
    if (!cef) return;
    setShowItems(false);
    if (cef.type === "heal") {
      schedulePlayerAction({
        type: "useItem",
        playerHpDelta: cef.amount,
        itemUsedUid: item.uid,
        message: `Voce bebe ${item.name}. (+${cef.amount} vida)`,
      }, 0);
      sfx.heal();
    } else if (cef.type === "sanity") {
      schedulePlayerAction({
        type: "useItem",
        playerSanityDelta: cef.amount,
        itemUsedUid: item.uid,
        message: `Voce bebe ${item.name}. (+${cef.amount} sanidade)`,
      }, 0, true);
    } else if (cef.type === "smoke") {
      schedulePlayerAction({
        type: "useItem",
        itemUsedUid: item.uid,
        message: `Voce explode ${item.name} e foge na fumaca.`,
        endCombat: "fled",
      }, 0, false);
    }
  };

  return (
    <div className="relative min-h-full flex flex-col items-center justify-start py-4 px-4 overflow-hidden">
      <div className={`relative z-10 text-lg-mobile text-base-desktop tracking-[0.3em] text-blood text-shadow-hard text-center font-bold`}>
        {combat.isBoss ? "CHEFE — " : "COMBATE — "}{combat.enemyName.toUpperCase()}
      </div>
      <div className="text-sm-mobile text-xs-desktop text-ink-dim mt-2 italic font-bold">TURNO {combat.turn}</div>

      {combat.enemyImage && (
        <div className="mt-4 w-full max-w-[260px] sm:max-w-[320px]">
          <img
            src={combat.enemyImage}
            alt={combat.enemyName}
            className="mx-auto block max-h-[160px] w-full object-contain rounded bg-transparent border-none"
            style={{ backgroundColor: "transparent" }}
          />
        </div>
      )}

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
                background: i < displayEnemyHp ? "#8b1a1a" : "#1a1d28",
                border: `1px solid ${i < displayEnemyHp ? "#d97a2a" : "#2a2d38"}`,
                opacity: damageLabel && i >= displayEnemyHp && i < displayEnemyHp + 1 ? 0.95 : 1,
              }}
            />
          ))}
        </div>
        <span className="text-ink-dim">{displayEnemyHp}/{combat.enemyMaxHp}</span>
      </div>

      {actionLabel && (
        <div className="mt-2 text-[9px] text-ember text-center w-full">{actionLabel}</div>
      )}
      {damageLabel && (
        <div className="mt-1 text-[20px] text-blood font-black text-center drop-shadow-lg">{damageLabel}</div>
      )}

      {/* Combat log (last 3) */}
      <div className="mt-3 text-[9px] text-ink-dim italic max-w-[500px] text-center px-2">
        {combat.log.slice(-3).map((l, i) => (
          <div key={i} className={i === combat.log.slice(-3).length - 1 ? "text-ink" : ""}>
            {">"} {l}
          </div>
        ))}
      </div>

      {resolved ? (
        <div className="relative z-10 mt-6 flex flex-col items-center gap-4 w-full">
          <button
            onClick={onContinue}
            className="text-lg-mobile text-base-desktop px-8 py-4 border-3 border-ember text-ember-bright hover:bg-ember hover:text-bg transition-all duration-200 min-h-[52px] font-bold rounded-lg"
          >
            CONTINUAR ►
          </button>
        </div>
      ) : busy ? (
        <div className="relative z-10 mt-4 flex flex-col items-center gap-2">
          <div className="text-[10px] text-blood tracking-[0.3em] flicker">
            {combat.enemyName.toUpperCase()} SE PREPARA...
          </div>
          <div className="flex gap-1">
            <span className="text-blood animate-pulse">●</span>
            <span className="text-blood animate-pulse" style={{ animationDelay: "0.2s" }}>●</span>
            <span className="text-blood animate-pulse" style={{ animationDelay: "1.8s" }}>●</span>
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
        <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 w-full max-w-[480px]">
          <button
            onClick={doAttack}
            className="text-sm-mobile text-xs-desktop px-4 py-4 border-2 border-blood hover:bg-blood/20 text-blood hover:text-ember-bright transition-colors min-h-[56px] font-bold rounded"
          >
            ⚔ ATACAR <span className="text-xs-mobile text-[10px] text-ink-dim block">({playerAtk})</span>
          </button>
          <button
            onClick={doDefend}
            className="text-sm-mobile text-xs-desktop px-4 py-4 border-2 border-mind hover:bg-mind/20 text-mind hover:text-mind-bright transition-colors min-h-[56px] font-bold rounded"
          >
            ▣ DEFENDER
          </button>
          <button
            onClick={() => setShowItems(true)}
            disabled={usableItems.length === 0}
            className="text-sm-mobile text-xs-desktop px-4 py-4 border-2 border-ember disabled:border-ink-dim disabled:text-ink-dim hover:bg-ember/20 text-ember hover:text-ember-bright transition-colors min-h-[56px] font-bold rounded"
          >
            ◎ USAR ITEM <span className="text-xs-mobile text-[10px] block">({usableItems.length})</span>
          </button>
          <button
            onClick={doFlee}
            className="text-sm-mobile text-xs-desktop px-4 py-4 border-2 border-ink-dim hover:border-ember-bright text-ink hover:text-ember-bright transition-colors min-h-[56px] font-bold rounded"
          >
            → FUGIR <span className="text-xs-mobile text-[10px] text-ink-dim block">({Math.round(flee * 100)}%)</span>
          </button>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 text-[10px] text-ink">
        <div className="text-[9px] text-ink-dim">SUA VIDA</div>
        <div className="flex gap-[2px]" style={{ filter: "drop-shadow(0 0 4px #d97a2a40)" }}>
          {Array.from({ length: 10 }).map((_, i) => {
            const filled = i < displayPlayerHp;
            return (
              <div
                key={i}
                className="h-3"
                style={{
                  width: 10,
                  background: filled ? "#8b1a1a" : "#1a1d28",
                  border: `1px solid ${filled ? "#d97a2a" : "#2a2d38"}`,
                  opacity: filled ? 1 : 0.45,
                }}
              />
            );
          })}
        </div>
        <span className="text-ink-dim">{displayPlayerHp}/{maxHp}</span>
      </div>
    </div>
  );
}
