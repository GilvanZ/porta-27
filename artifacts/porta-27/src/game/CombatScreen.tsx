import { useEffect, useRef, useState } from "react";
import type { CombatData, RoomResolution } from "./rooms";
import type { AggregatedEffects } from "./generate";
import type { Item } from "./types";
import { pickRandomItem } from "./items";
import { sfx } from "./audio";

interface CombatScreenProps {
  combat: CombatData;
  startingHp: number;
  startingSanity: number;
  ownedItems: Item[];
  eff: AggregatedEffects;
  onResolve: (r: RoomResolution) => void;
}

interface LogLine {
  text: string;
  kind: "player" | "enemy" | "info";
}

export function CombatScreen({
  combat,
  startingHp,
  startingSanity,
  ownedItems,
  eff,
  onResolve,
}: CombatScreenProps) {
  const [enemyHp, setEnemyHp] = useState(combat.enemyMaxHp);
  const [hpDelta, setHpDelta] = useState(0);
  const [sanityDelta, setSanityDelta] = useState(0);
  const [log, setLog] = useState<LogLine[]>([
    { text: `${combat.enemyName} aparece. Vida ${combat.enemyMaxHp}.`, kind: "info" },
  ]);
  const [busy, setBusy] = useState(false);
  const [enemyShake, setEnemyShake] = useState(false);
  const [playerShake, setPlayerShake] = useState(false);
  const [enemyFlash, setEnemyFlash] = useState(false);
  const ended = useRef(false);

  const playerHp = Math.max(0, startingHp + hpDelta);
  const playerSanity = Math.max(0, startingSanity + sanityDelta);

  useEffect(() => {
    return () => {
      ended.current = true;
    };
  }, []);

  const pushLog = (line: LogLine) =>
    setLog((l) => [...l.slice(-6), line]);

  const finishVictory = () => {
    if (ended.current) return;
    ended.current = true;
    const lootMult = 1 + eff.lootMod + eff.killLootBonus;
    const gold = Math.max(0, Math.round(combat.goldOnKill * lootMult));
    let item: Item | null = null;
    const dropChance = combat.itemDropChance + (eff.killLootBonus > 0 ? 0.15 : 0);
    if (Math.random() < dropChance) {
      item = pickRandomItem(Math.random, ownedItems.map((i) => i.id));
    }
    sfx.treasure();
    onResolve({
      hpDelta,
      sanityDelta: sanityDelta + combat.sanityOnKill,
      goldDelta: gold,
      itemGained: item,
      message: `Voce derrota ${combat.enemyName}. (+${gold} ouro${item ? `, +${item.name}` : ""})`,
      end: true,
    });
  };

  const finishDefeat = (extraHp: number, msg: string) => {
    if (ended.current) return;
    ended.current = true;
    onResolve({
      hpDelta: hpDelta + extraHp,
      sanityDelta: sanityDelta - 1,
      message: msg,
      end: true,
    });
  };

  const finishEscape = (sanCost = 1) => {
    if (ended.current) return;
    ended.current = true;
    onResolve({
      hpDelta,
      sanityDelta: sanityDelta - sanCost,
      message: `Voce escapa de ${combat.enemyName}. (-${sanCost} sanidade)`,
      end: true,
    });
  };

  const enemyAttack = (currentHpDelta: number, currentSanDelta: number) => {
    const baseDmg = combat.enemyAtk + Math.floor(Math.random() * 2);
    const modded = Math.max(1, Math.round(baseDmg * (1 + eff.enemyDmgMod)));
    const finalDmg = eff.critReduction > 0
      ? Math.max(1, modded - eff.critReduction)
      : modded;
    const sanHit = combat.enemySanityAtk && Math.random() < 0.4 ? 1 : 0;

    const newHpDelta = currentHpDelta - finalDmg;
    const newSanDelta = currentSanDelta - sanHit;
    setHpDelta(newHpDelta);
    setSanityDelta(newSanDelta);
    setPlayerShake(true);
    setTimeout(() => setPlayerShake(false), 350);
    sfx.hit();
    pushLog({
      text: `${combat.enemyName} ataca. -${finalDmg} vida${sanHit ? ", -1 sanidade" : ""}.`,
      kind: "enemy",
    });

    if (startingHp + newHpDelta <= 0 || startingSanity + newSanDelta <= 0) {
      setTimeout(() => {
        finishDefeat(0, `${combat.enemyName} te derruba.`);
      }, 600);
    } else {
      setBusy(false);
    }
  };

  const onAttack = () => {
    if (busy || ended.current) return;
    setBusy(true);
    const baseDmg = 2 + Math.floor(Math.random() * 2); // 2-3 base
    const weaponBonus = eff.weaponDmg + (eff.weaponDmgRandom > 0 ? Math.floor(Math.random() * (eff.weaponDmgRandom + 1)) : 0);
    const dmg = baseDmg + weaponBonus;
    const newEnemyHp = Math.max(0, enemyHp - dmg);
    setEnemyHp(newEnemyHp);
    setEnemyShake(true);
    setEnemyFlash(true);
    setTimeout(() => setEnemyShake(false), 280);
    setTimeout(() => setEnemyFlash(false), 220);
    sfx.hit();
    pushLog({ text: `Voce ataca. -${dmg} vida.`, kind: "player" });

    if (newEnemyHp <= 0) {
      setTimeout(() => finishVictory(), 500);
    } else {
      setTimeout(() => enemyAttack(hpDelta, sanityDelta), 550);
    }
  };

  const onRun = () => {
    if (busy || ended.current) return;
    setBusy(true);
    const escapeChance = Math.min(0.95, Math.max(0.05, combat.baseEscapeChance + eff.escapeBonus));
    if (Math.random() < escapeChance) {
      sfx.step();
      pushLog({ text: `Voce escapa! (chance ${Math.round(escapeChance * 100)}%)`, kind: "info" });
      setTimeout(() => finishEscape(1), 400);
    } else {
      pushLog({
        text: `Falha ao fugir (chance ${Math.round(escapeChance * 100)}%). ${combat.enemyName} te alcanca!`,
        kind: "enemy",
      });
      setTimeout(() => {
        const baseDmg = combat.enemyAtk + 1 + Math.floor(Math.random() * 2);
        const modded = Math.max(1, Math.round(baseDmg * (1 + eff.enemyDmgMod)));
        const finalDmg = eff.critReduction > 0
          ? Math.max(1, modded - eff.critReduction)
          : modded;
        const newHpDelta = hpDelta - finalDmg;
        setHpDelta(newHpDelta);
        setPlayerShake(true);
        setTimeout(() => setPlayerShake(false), 350);
        sfx.hit();
        pushLog({ text: `Mordida nas costas. -${finalDmg} vida.`, kind: "enemy" });

        if (startingHp + newHpDelta <= 0) {
          setTimeout(() => finishDefeat(0, `${combat.enemyName} te pega na fuga.`), 500);
        } else {
          setBusy(false);
        }
      }, 500);
    }
  };

  const escapeChance = Math.round(
    Math.min(0.95, Math.max(0.05, combat.baseEscapeChance + eff.escapeBonus)) * 100
  );

  const playerAtkRange = (() => {
    const lo = 2 + eff.weaponDmg;
    const hi = 3 + eff.weaponDmg + eff.weaponDmgRandom;
    return `${lo}-${hi}`;
  })();

  return (
    <div className="min-h-full flex flex-col items-center justify-start py-2 px-2 gap-3">
      <div className={`text-[12px] sm:text-[14px] tracking-[0.25em] sm:tracking-[0.3em] text-shadow-hard text-center text-blood ${combat.isBoss ? "glow-pulse" : ""}`}>
        {combat.enemyName.toUpperCase()}
        {combat.isBoss && <span className="text-ember ml-2 text-[9px]">[CHEFE]</span>}
      </div>

      {/* Enemy */}
      <div className={`flex flex-col items-center ${enemyShake ? "animate-[shake_0.25s]" : ""}`}>
        <div
          className="text-blood text-shadow-hard"
          style={{
            filter: enemyFlash
              ? "drop-shadow(0 0 12px #f5b25c) brightness(1.6)"
              : "drop-shadow(0 0 6px #8b1a1a)",
            transition: "filter 120ms",
          }}
        >
          <pre className="text-[10px] sm:text-[12px] leading-[1.05]">
{combat.isBoss ? BOSS_ART : ENEMY_ART}
          </pre>
        </div>
        <HpBar value={enemyHp} max={combat.enemyMaxHp} color="#8b1a1a" glow="#d97a2a" label="INIMIGO" />
      </div>

      {/* Player */}
      <div className={`flex flex-col items-center mt-1 ${playerShake ? "animate-[shake_0.3s]" : ""}`}>
        <div className="text-ember text-[9px] tracking-widest mb-1">VOCE</div>
        <div className="flex gap-3 text-[9px] text-ink-dim">
          <span>VIDA <span className="text-blood">{playerHp}</span></span>
          <span>SANIDADE <span className="text-mind">{playerSanity}</span></span>
          <span>ATAQUE <span className="text-ember-bright">{playerAtkRange}</span></span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 w-full max-w-[420px]">
        <button
          onClick={onAttack}
          disabled={busy || ended.current}
          className="text-[10px] px-3 py-3 border-2 border-blood text-ink hover:bg-blood/30 active:bg-blood/40 transition-colors text-left min-h-[44px] disabled:opacity-40"
        >
          {">"} ATACAR <span className="text-ink-dim">({playerAtkRange} dano)</span>
        </button>
        <button
          onClick={onRun}
          disabled={busy || ended.current}
          className="text-[10px] px-3 py-3 border-2 border-ember/70 text-ember-bright hover:bg-ember/20 active:bg-ember/30 transition-colors text-left min-h-[44px] disabled:opacity-40"
        >
          {">"} FUGIR <span className="text-ink-dim">({escapeChance}% sucesso)</span>
        </button>
      </div>

      {/* Log */}
      <div className="w-full max-w-[420px] mt-1 border border-ink-dim/30 bg-bg-soft/40 px-3 py-2 text-[9px] leading-relaxed">
        {log.slice(-5).map((l, i) => (
          <div
            key={i}
            className={
              l.kind === "player"
                ? "text-ember-bright"
                : l.kind === "enemy"
                ? "text-blood"
                : "text-ink-dim"
            }
          >
            {">"} {l.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function HpBar({
  value,
  max,
  color,
  glow,
  label,
}: {
  value: number;
  max: number;
  color: string;
  glow: string;
  label: string;
}) {
  const cells = Math.min(max, 20);
  const filled = Math.round((value / max) * cells);
  return (
    <div className="flex flex-col items-center gap-1 mt-1">
      <div className="text-[8px] text-ink-dim tracking-widest">{label} {value}/{max}</div>
      <div className="flex gap-[2px]" style={{ filter: `drop-shadow(0 0 4px ${glow}50)` }}>
        {Array.from({ length: cells }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 8,
              height: 10,
              background: i < filled ? color : "#1a1d28",
              border: `1px solid ${i < filled ? glow : "#2a2d38"}`,
              transition: "background 200ms",
            }}
          />
        ))}
      </div>
    </div>
  );
}

const ENEMY_ART = `   ╲╱╲╱╲      ╱╲╱
   ▓▓▓▓▓▓▓▓▓▓▓▓▓
   ▓ ◉   ◉ ▓
   ▓   ▼   ▓
   ▓ ▓▓▓▓▓ ▓
   ▓▓▓▓▓▓▓▓▓▓▓▓▓
        ╱  ╲`;

const BOSS_ART = `▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
▓▓ ◉◉      ◉◉ ▓▓
▓▓               ▓▓
▓▓   ▼▼▼▼▼▼▼▼   ▓▓
▓▓               ▓▓
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
    ╲╲    ╱╱
    ╲╲    ╱╱`;
