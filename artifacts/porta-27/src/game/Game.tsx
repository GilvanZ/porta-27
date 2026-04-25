import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { CombatState, Door, Item, RunState } from "./types";
import { aggregateEffects, generateDoors, generateMapPreview } from "./generate";
import { buildRoom, type RoomData } from "./rooms";
import { sfx, startAmbient, setMuted } from "./audio";
import { makeRng } from "./rng";
import { Title } from "./Title";
import { HUD } from "./HUD";
import { Corridor } from "./Corridor";
import { DoorChoices } from "./DoorChoices";
import { RoomScreen } from "./RoomScreen";
import { GameOver } from "./GameOver";
import { Victory } from "./Victory";
import { Inventory } from "./Inventory";
import { CombatScreen, type CombatAction } from "./CombatScreen";
import { canDiscard, makeStarterChoices, pickRandomItem, rarityColor } from "./items";
import { makeEnemyCombat } from "./combat";

const STORAGE_KEY = "porta27.meta";

interface MetaSave {
  bestRun: number;
  totalRuns: number;
  victories: number;
}

function loadMeta(): MetaSave {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { bestRun: 0, totalRuns: 0, victories: 0 };
    return JSON.parse(raw);
  } catch {
    return { bestRun: 0, totalRuns: 0, victories: 0 };
  }
}

function saveMeta(m: MetaSave) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(m));
  } catch {}
}

function makeInitialRun(seed: number): RunState {
  return {
    hp: 10,
    maxHp: 10,
    sanity: 10,
    maxSanity: 10,
    gold: 0,
    doorNumber: 0,
    phase: "title",
    items: [],
    doors: [],
    log: ["O corredor te recebe em silencio."],
    roomResolved: false,
    currentRoom: null,
    combat: null,
    bestRun: 0,
    totalRuns: 0,
    deathCause: "",
    seed,
    healGained: 0,
    roomsCleared: 0,
    visionActive: false,
    reviveUsed: false,
  };
}

const HEAL_INTERVAL = 2;
const HEAL_CAP = 10;

type Action =
  | { type: "start"; seed: number }
  | { type: "pickStarter"; item: Item }
  | { type: "chooseDoor"; door: Door; combat: CombatState | null }
  | {
      type: "applyResolution";
      payload: {
        hpDelta?: number;
        sanityDelta?: number;
        goldDelta?: number;
        itemGained?: Item | null;
        itemRemovedId?: string;
        message: string;
        extraDoorAdvance?: number;
        extraDoorRetreat?: number;
      };
    }
  | { type: "endRoom" }
  | { type: "reset"; seed: number }
  | { type: "log"; line: string }
  | { type: "setMeta"; meta: MetaSave }
  | { type: "victory" }
  | { type: "equip"; uid: string }
  | { type: "discard"; uid: string }
  | { type: "useConsumable"; uid: string }
  | { type: "activateVision" }
  | { type: "consumeVision" }
  | { type: "combatAction"; action: CombatAction; itemGained: Item | null }
  | { type: "endCombat" }
  | { type: "totemRevive" };

function recomputeMaxes(state: RunState, items: Item[]): { maxHp: number; maxSanity: number } {
  const eff = aggregateEffects(items);
  const maxHp = Math.max(3, 10 + eff.maxHpBonus);
  return {
    maxHp,
    maxSanity: maxHp,
  };
}

function reducer(state: RunState, action: Action): RunState {
  switch (action.type) {
    case "start": {
      return {
        ...makeInitialRun(action.seed),
        phase: "starter-pick",
        bestRun: state.bestRun,
        totalRuns: state.totalRuns,
      };
    }
    case "pickStarter": {
      const items = [action.item];
      const eff = aggregateEffects(items);
      const maxHp = Math.max(3, 10 + eff.maxHpBonus);
      return {
        ...state,
        items,
        hp: maxHp,
        maxHp,
        sanity: maxHp,
        maxSanity: maxHp,
        phase: "doors",
        log: [...state.log, `Voce escolhe ${action.item.name}.`].slice(-30),
      };
    }
    case "chooseDoor": {
      const eff = aggregateEffects(state.items);
      const sanityDrain = eff.sanityDrainPerRoom;
      const hpDrain = eff.hpDrainPerRoom;
      const goldGain = eff.goldGainOnDoor;

      const newSanity = Math.max(0, state.sanity - sanityDrain);
      const newHp = Math.max(0, state.hp - hpDrain);
      const newGold = state.gold + goldGain;
      const newDoorNumber = action.door.doorNumber;
      const log = [...state.log, `Porta ${action.door.doorNumber}.`];

      // consume vision item if active
      let items = state.items;
      let visionActive = state.visionActive;
      if (state.visionActive) {
        const idx = items.findIndex((i) => i.active === "olho_vidro");
        if (idx >= 0) {
          items = [...items];
          items.splice(idx, 1);
        }
        visionActive = false;
      }

      const isCombat = !!action.combat;
      return {
        ...state,
        items,
        visionActive,
        sanity: newSanity,
        hp: newHp,
        gold: newGold,
        doorNumber: newDoorNumber,
        currentRoom: { door: action.door, eventIndex: 0, data: null },
        combat: action.combat,
        phase: isCombat ? "combat" : "room",
        roomResolved: false,
        log: log.slice(-30),
      };
    }
    case "applyResolution": {
      const p = action.payload;
      let items = [...state.items];
      if (p.itemRemovedId) {
        const idx = items.findIndex((i) => i.id === p.itemRemovedId);
        if (idx >= 0) items.splice(idx, 1);
      }
      if (p.itemUsedUid) {
        const idx = items.findIndex((i) => i.uid === p.itemUsedUid);
        if (idx >= 0) {
          const current = items[idx];
          if (current.charges && current.charges > 1) {
            items[idx] = { ...current, charges: current.charges - 1 };
          } else {
            items = items.filter((i) => i.uid !== p.itemUsedUid);
          }
        }
      }
      if (p.itemGained) items.push(p.itemGained);

      const { maxHp, maxSanity } = recomputeMaxes(state, items);
      const newHp = Math.max(0, Math.min(maxHp, state.hp + (p.hpDelta ?? 0)));
      const newSanity = Math.max(0, Math.min(maxSanity, state.sanity + (p.sanityDelta ?? 0)));
      const newGold = Math.max(0, state.gold + (p.goldDelta ?? 0));

      let newDoorNumber = state.doorNumber + (p.extraDoorAdvance ?? 0) - (p.extraDoorRetreat ?? 0);
      newDoorNumber = Math.max(0, Math.min(100, newDoorNumber));

      const log = [...state.log, p.message].slice(-30);

      let phase = state.phase;
      let deathCause = state.deathCause;
      if (newHp <= 0) {
        phase = "gameover";
        deathCause = "Sua vida foi reduzida a zero.";
      } else if (newSanity <= 0) {
        phase = "gameover";
        deathCause = "Sua sanidade se desfez no escuro.";
      } else if (newDoorNumber >= 100) {
        phase = "victory";
      }

      return {
        ...state,
        items,
        hp: newHp,
        sanity: newSanity,
        gold: newGold,
        maxHp,
        maxSanity,
        doorNumber: newDoorNumber,
        log,
        phase,
        deathCause,
        roomResolved: true,
      };
    }
    case "endRoom": {
      if (state.phase !== "room" && state.phase !== "combat") return state;
      const roomsCleared = state.roomsCleared + 1;
      let hp = state.hp;
      let sanity = state.sanity;
      let healGained = state.healGained;
      const log = [...state.log];
      const eff = aggregateEffects(state.items);

      // Per-room hp regen from items
      if (eff.hpRegenPerRoom > 0) {
        const r = Math.floor(eff.hpRegenPerRoom + (roomsCleared * (eff.hpRegenPerRoom % 1)) - Math.floor((roomsCleared - 1) * (eff.hpRegenPerRoom % 1)));
        if (r > 0) hp = Math.min(state.maxHp, hp + r);
      }

      if (
        roomsCleared > 0 &&
        roomsCleared % HEAL_INTERVAL === 0 &&
        healGained < HEAL_CAP
      ) {
        const before = hp;
        hp = Math.min(state.maxHp, hp + 1);
        sanity = Math.min(state.maxSanity, sanity + 1);
        const gained = hp - before;
        if (gained > 0) healGained += gained;
        log.push("Voce respira fundo. (+1 vida, +1 sanidade)");
      }
      return {
        ...state,
        currentRoom: null,
        combat: null,
        phase: "doors",
        roomResolved: false,
        roomsCleared,
        hp,
        sanity,
        healGained,
        log: log.slice(-30),
      };
    }
    case "reset": {
      return {
        ...makeInitialRun(action.seed),
        phase: "title",
        bestRun: state.bestRun,
        totalRuns: state.totalRuns,
      };
    }
    case "log":
      return { ...state, log: [...state.log, action.line].slice(-30) };
    case "setMeta":
      return { ...state, bestRun: action.meta.bestRun, totalRuns: action.meta.totalRuns };
    case "victory":
      return { ...state, phase: "victory" };
    case "equip": {
      const target = state.items.find((i) => i.uid === action.uid);
      if (!target || !target.slot) return state;
      const items = state.items.map((i) => {
        if (i.uid === action.uid) return { ...i, equipped: !i.equipped };
        // unequip same slot if equipping a new one
        if (target.slot && i.slot === target.slot && i.equipped && !target.equipped) {
          return { ...i, equipped: false };
        }
        return i;
      });
      const { maxHp, maxSanity } = recomputeMaxes(state, items);
      return {
        ...state,
        items,
        maxHp,
        maxSanity,
        hp: Math.min(maxHp, state.hp),
        sanity: Math.min(maxSanity, state.sanity),
        log: [...state.log, target.equipped ? `Voce desequipa ${target.name}.` : `Voce equipa ${target.name}.`].slice(-30),
      };
    }
    case "discard": {
      const target = state.items.find((i) => i.uid === action.uid);
      if (!target || !canDiscard(target, state.doorNumber)) return state;
      const items = state.items.filter((i) => i.uid !== action.uid);
      const { maxHp, maxSanity } = recomputeMaxes(state, items);
      return {
        ...state,
        items,
        maxHp,
        maxSanity,
        hp: Math.min(maxHp, state.hp),
        sanity: Math.min(maxSanity, state.sanity),
        log: [...state.log, `Voce descarta ${target.name}.`].slice(-30),
      };
    }
    case "useConsumable": {
      const target = state.items.find((i) => i.uid === action.uid);
      if (!target || !target.active) return state;
      let hp = state.hp;
      let sanity = state.sanity;
      let msg = "";
      let items = state.items;

      if (target.active === "pocao_vida") {
        hp = Math.min(state.maxHp, hp + 4);
        msg = `Voce bebe ${target.name}. (+4 vida)`;
        items = items.filter((i) => i.uid !== action.uid);
      } else if (target.active === "pocao_sanidade") {
        sanity = Math.min(state.maxSanity, sanity + 4);
        msg = `Voce bebe ${target.name}. (+4 sanidade)`;
        items = items.filter((i) => i.uid !== action.uid);
      } else if (target.active === "lanterna") {
        msg = `Voce acende ${target.name}. Restam ${Math.max(0, (target.charges ?? 1) - 1)} usos.`;
        if (target.charges && target.charges > 1) {
          items = items.map((i) => (i.uid === action.uid ? { ...i, charges: i.charges! - 1 } : i));
        } else {
          items = items.filter((i) => i.uid !== action.uid);
        }
      } else {
        return state;
      }
      return { ...state, items, hp, sanity, log: [...state.log, msg].slice(-30) };
    }
    case "activateVision": {
      if (state.visionActive) return state;
      const has = state.items.some((i) => i.active === "olho_vidro");
      if (!has) return state;
      return {
        ...state,
        visionActive: true,
        log: [...state.log, "Voce ativa o Olho de Vidro. As portas piscam."].slice(-30),
      };
    }
    case "consumeVision": {
      const items = [...state.items];
      const idx = items.findIndex((i) => i.active === "olho_vidro");
      if (idx >= 0) items.splice(idx, 1);
      return { ...state, items, visionActive: false };
    }
    case "combatAction": {
      if (!state.combat) return state;
      const a = action.action;
      const newEnemyHp = Math.max(0, state.combat.enemyHp + (a.enemyHpDelta ?? 0));
      let items = state.items;
      if (a.itemUsedUid) {
        const idx = items.findIndex((i) => i.uid === a.itemUsedUid);
        if (idx >= 0) {
          const current = items[idx];
          if (current.charges && current.charges > 1) {
            items = [...items];
            items[idx] = { ...current, charges: current.charges - 1 };
          } else {
            items = items.filter((i) => i.uid !== a.itemUsedUid);
          }
        }
      }
      if (a.itemGainedFromVictory && action.itemGained) items = [...items, action.itemGained];
      const { maxHp, maxSanity } = recomputeMaxes(state, items);
      const newHp = Math.max(0, Math.min(maxHp, state.hp + (a.playerHpDelta ?? 0)));
      const newSanity = Math.max(0, Math.min(maxSanity, state.sanity + (a.playerSanityDelta ?? 0)));
      const newGold = Math.max(0, state.gold + (a.goldDelta ?? 0));
      const log = [...state.combat.log, a.message].slice(-30);
      const gameLog = [...state.log, a.message].slice(-30);

      let phase = state.phase;
      let deathCause = state.deathCause;
      let resolved = state.roomResolved;
      if (newHp <= 0) {
        phase = "gameover";
        deathCause = `${state.combat.enemyName} te derrubou.`;
      } else if (newEnemyHp <= 0 || a.endCombat === "win" || a.endCombat === "fled") {
        resolved = true;
      }

      return {
        ...state,
        items,
        hp: newHp,
        sanity: newSanity,
        gold: newGold,
        maxHp,
        maxSanity,
        combat: {
          ...state.combat,
          enemyHp: newEnemyHp,
          defending: a.type === "playerDefend",
          log,
          turn: state.combat.turn + 1,
        },
        phase,
        deathCause,
        roomResolved: resolved,
        log: gameLog,
      };
    }
    case "endCombat": {
      if (state.phase !== "combat") return state;
      const roomsCleared = state.roomsCleared + 1;
      let hp = state.hp;
      let sanity = state.sanity;
      let healGained = state.healGained;
      const log = [...state.log];
      if (
        roomsCleared > 0 &&
        roomsCleared % HEAL_INTERVAL === 0 &&
        healGained < HEAL_CAP
      ) {
        const before = hp;
        hp = Math.min(state.maxHp, hp + 1);
        sanity = Math.min(state.maxSanity, sanity + 1);
        const gained = hp - before;
        if (gained > 0) healGained += gained;
        log.push("Voce respira fundo. (+1 vida, +1 sanidade)");
      }
      return {
        ...state,
        currentRoom: null,
        combat: null,
        phase: "doors",
        roomResolved: false,
        roomsCleared,
        hp,
        sanity,
        healGained,
        log: log.slice(-30),
      };
    }
    case "totemRevive": {
      const idx = state.items.findIndex((i) => i.active === "totem_tempo");
      if (idx < 0 || state.reviveUsed) return state;
      const items = [...state.items];
      items.splice(idx, 1);
      const { maxHp, maxSanity } = recomputeMaxes(state, items);
      const newDoor = Math.max(1, state.doorNumber - 5);
      return {
        ...state,
        items,
        reviveUsed: true,
        hp: Math.max(3, Math.floor(maxHp * 0.5)),
        sanity: Math.max(3, Math.floor(maxSanity * 0.5)),
        maxHp,
        maxSanity,
        doorNumber: newDoor,
        phase: "doors",
        combat: null,
        currentRoom: null,
        roomResolved: false,
        deathCause: "",
        log: [...state.log, `O Totem do Tempo gira. Voce volta para a porta ${newDoor}.`].slice(-30),
      };
    }
  }
}

export function Game() {
  const [state, dispatch] = useReducer(reducer, undefined as unknown as RunState, () => {
    const meta = loadMeta();
    const init = makeInitialRun(Date.now() & 0xffffffff);
    return { ...init, bestRun: meta.bestRun, totalRuns: meta.totalRuns };
  });

  const [muted, setMutedState] = useState(false);
  const meta = useRef<MetaSave>(loadMeta());

  const stepRng = useMemo(() => {
    return makeRng(state.seed ^ (state.doorNumber * 2654435761));
  }, [state.seed, state.doorNumber]);

  const eff = useMemo(() => aggregateEffects(state.items), [state.items]);

  const doorsForChoice = useMemo<Door[]>(() => {
    if (state.phase !== "doors") return [];
    return generateDoors(stepRng, state.doorNumber, state.items, eff);
  }, [state.phase, state.doorNumber, state.items, stepRng, eff]);

  const mapPreview = useMemo(() => {
    if (!eff.mapBonus) return null;
    return generateMapPreview(state.seed, state.doorNumber + 1, 5, state.items);
  }, [eff.mapBonus, state.seed, state.doorNumber, state.items]);

  const roomData = useMemo<RoomData | null>(() => {
    if (state.phase !== "room" || !state.currentRoom) return null;
    const ctxRng = makeRng((state.seed ^ (state.doorNumber * 16777619)) >>> 0);
    return buildRoom(state.currentRoom.door, {
      rng: ctxRng,
      doorNumber: state.doorNumber,
      items: state.items,
      eff,
      hp: state.hp,
      maxHp: state.maxHp,
      sanity: state.sanity,
      maxSanity: state.maxSanity,
      gold: state.gold,
    });
  }, [state.phase, state.currentRoom, state.seed, state.doorNumber, state.items, eff, state.hp, state.maxHp, state.sanity, state.maxSanity, state.gold]);

  const handleStart = useCallback(() => {
    startAmbient();
    sfx.select();
    dispatch({ type: "start", seed: (Date.now() ^ Math.floor(Math.random() * 1e9)) & 0xffffffff });
  }, []);

  const handleChooseDoor = useCallback(
    (door: Door) => {
      sfx.doorOpen();
      let combat: CombatState | null = null;
      if (door.trueKind === "enemy" || door.trueKind === "boss") {
        const cRng = makeRng((state.seed ^ (door.doorNumber * 2246822519)) >>> 0);
        combat = makeEnemyCombat(cRng, door.doorNumber, eff, door.trueKind === "boss");
      }
      dispatch({ type: "chooseDoor", door, combat });
    },
    [state.seed, eff]
  );

  const handleResolve = useCallback((res: any) => {
    if ((res.hpDelta ?? 0) < 0) sfx.hit();
    if ((res.hpDelta ?? 0) > 0) sfx.heal();
    if ((res.goldDelta ?? 0) > 0) sfx.coin();
    if (res.itemGained) sfx.treasure();
    if ((res.sanityDelta ?? 0) < 0) sfx.insanity();
    dispatch({ type: "applyResolution", payload: res });
  }, []);

  const handleContinue = useCallback(() => {
    sfx.step();
    if (state.phase === "combat") dispatch({ type: "endCombat" });
    else dispatch({ type: "endRoom" });
  }, [state.phase]);

  const handleReset = useCallback(() => {
    sfx.select();
    dispatch({ type: "reset", seed: (Date.now() ^ Math.floor(Math.random() * 1e9)) & 0xffffffff });
  }, []);

  const handleCombatAction = useCallback(
    (a: CombatAction) => {
      let itemGained: Item | null = null;
      if (a.itemGainedFromVictory) {
        // generate reward item using deterministic rng based on combat
        const rng = makeRng((state.seed ^ (state.doorNumber * 65537) ^ (state.combat?.turn ?? 1)) >>> 0);
        itemGained = pickRandomItem(rng, state.doorNumber, state.items.map((i) => i.id));
      }
      dispatch({ type: "combatAction", action: a, itemGained });
    },
    [state.seed, state.doorNumber, state.combat?.turn, state.items]
  );

  // Totem revive on death
  useEffect(() => {
    if (state.phase === "gameover" && !state.reviveUsed) {
      const hasTotem = state.items.some((i) => i.active === "totem_tempo");
      if (hasTotem) {
        dispatch({ type: "totemRevive" });
      }
    }
  }, [state.phase, state.reviveUsed, state.items]);

  useEffect(() => {
    if (state.phase === "gameover" && state.reviveUsed) {
      sfx.death();
      const newMeta: MetaSave = {
        bestRun: Math.max(meta.current.bestRun, state.doorNumber),
        totalRuns: meta.current.totalRuns + 1,
        victories: meta.current.victories,
      };
      meta.current = newMeta;
      saveMeta(newMeta);
      dispatch({ type: "setMeta", meta: newMeta });
    } else if (state.phase === "gameover") {
      // No revive available — record death too
      const hasTotem = state.items.some((i) => i.active === "totem_tempo");
      if (!hasTotem) {
        sfx.death();
        const newMeta: MetaSave = {
          bestRun: Math.max(meta.current.bestRun, state.doorNumber),
          totalRuns: meta.current.totalRuns + 1,
          victories: meta.current.victories,
        };
        meta.current = newMeta;
        saveMeta(newMeta);
        dispatch({ type: "setMeta", meta: newMeta });
      }
    }
    if (state.phase === "victory") {
      sfx.victory();
      const newMeta: MetaSave = {
        bestRun: 100,
        totalRuns: meta.current.totalRuns + 1,
        victories: meta.current.victories + 1,
      };
      meta.current = newMeta;
      saveMeta(newMeta);
      dispatch({ type: "setMeta", meta: newMeta });
    }
  }, [state.phase, state.doorNumber, state.reviveUsed]);

  useEffect(() => {
    const onFirst = () => {
      startAmbient();
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
    };
    window.addEventListener("pointerdown", onFirst);
    window.addEventListener("keydown", onFirst);
    return () => {
      window.removeEventListener("pointerdown", onFirst);
      window.removeEventListener("keydown", onFirst);
    };
  }, []);

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    setMutedState(m);
  };

  const starterChoices = useMemo(() => {
    if (state.phase !== "starter-pick") return [];
    const r = makeRng((state.seed ^ 0x9e3779b1) >>> 0);
    return makeStarterChoices(r);
  }, [state.phase, state.seed]);

  const inGame = state.phase === "doors" || state.phase === "room" || state.phase === "combat";
  const hasOlhoVidro = state.items.some((i) => i.active === "olho_vidro");
  const canActivateVision = hasOlhoVidro && state.phase === "doors" && !state.visionActive;
  const inCombat = state.phase === "combat";

  return (
    <div className="crt relative w-full min-h-screen md:h-full bg-bg md:overflow-hidden flex flex-col items-center justify-center select-none">
      <FogLayer />

      {state.phase === "title" && (
        <Title bestRun={state.bestRun} totalRuns={state.totalRuns} onStart={handleStart} />
      )}

      {state.phase === "starter-pick" && (
        <StarterPick
          choices={starterChoices}
          onPick={(it) => {
            sfx.treasure();
            dispatch({ type: "pickStarter", item: it });
          }}
        />
      )}

      {inGame && (
        <div className="relative z-10 w-full max-w-[1100px] px-2 sm:px-4 py-3 flex flex-col min-h-screen md:h-full">
          <HUD state={state} onMute={toggleMute} muted={muted} />

          <Corridor doorNumber={state.doorNumber} mapPreview={mapPreview} />

          <div className="flex-1 min-h-0 mt-3">
            {state.phase === "doors" && (
              <DoorChoices
                doors={doorsForChoice}
                onChoose={handleChooseDoor}
                eff={eff}
                visionActive={state.visionActive}
              />
            )}
            {state.phase === "room" && roomData && (
              <RoomScreen
                room={roomData}
                kind={state.currentRoom?.door.trueKind ?? "empty"}
                ctx={{ hp: state.hp, sanity: state.sanity, gold: state.gold, maxHp: state.maxHp, maxSanity: state.maxSanity }}
                resolved={state.roomResolved}
                onResolve={handleResolve}
                onContinue={handleContinue}
              />
            )}
            {state.phase === "combat" && state.combat && (
              <CombatScreen
                combat={state.combat}
                eff={eff}
                items={state.items}
                hp={state.hp}
                maxHp={state.maxHp}
                onAction={handleCombatAction}
                onContinue={handleContinue}
                resolved={state.roomResolved}
              />
            )}
          </div>

          <Log lines={state.log} />
        </div>
      )}

      {state.phase === "gameover" && state.reviveUsed && (
        <GameOver doorReached={state.doorNumber} cause={state.deathCause} onRetry={handleReset} bestRun={state.bestRun} />
      )}
      {state.phase === "gameover" && !state.reviveUsed && !state.items.some((i) => i.active === "totem_tempo") && (
        <GameOver doorReached={state.doorNumber} cause={state.deathCause} onRetry={handleReset} bestRun={state.bestRun} />
      )}

      {state.phase === "victory" && <Victory onAgain={handleReset} />}

      {inGame && (
        <Inventory
          items={state.items}
          currentDoor={state.doorNumber}
          visionActive={state.visionActive}
          canActivateVision={canActivateVision}
          inCombat={inCombat}
          onUseItem={(uid) => {
            const it = state.items.find((i) => i.uid === uid);
            if (!it) return;
            if (inCombat) {
              // forward to combat handler — bomba_fumaca / pocao
              if (it.active === "bomba_fumaca") {
                handleCombatAction({
                  type: "useItem",
                  itemUsedUid: uid,
                  message: `Voce explode ${it.name} e foge na fumaca.`,
                  endCombat: "fled",
                });
              } else if (it.active === "pocao_vida") {
                handleCombatAction({ type: "useItem", playerHpDelta: 4, itemUsedUid: uid, message: `Voce bebe ${it.name}. (+4 vida)` });
              } else if (it.active === "pocao_sanidade") {
                handleCombatAction({ type: "useItem", playerSanityDelta: 4, itemUsedUid: uid, message: `Voce bebe ${it.name}. (+4 sanidade)` });
              }
            } else {
              dispatch({ type: "useConsumable", uid });
            }
          }}
          onEquip={(uid) => dispatch({ type: "equip", uid })}
          onDiscard={(uid) => dispatch({ type: "discard", uid })}
          onActivateVision={() => dispatch({ type: "activateVision" })}
        />
      )}
    </div>
  );
}

function StarterPick({ choices, onPick }: { choices: Item[]; onPick: (i: Item) => void }) {
  return (
    <div className="relative z-10 w-full max-w-[800px] px-4 py-8 flex flex-col items-center text-center">
      <div className="text-[12px] tracking-[0.4em] text-ember-bright text-shadow-ember mb-2">
        ANTES DA PRIMEIRA PORTA
      </div>
      <div className="text-[10px] text-ink-dim italic mb-8 max-w-[520px]">
        Voce encontra tres objetos no chao do corredor. Pegue apenas um.
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        {choices.map((it) => (
          <button
            key={it.uid}
            onClick={() => onPick(it)}
            className="border-2 border-ink-dim hover:border-ember-bright bg-bg/60 hover:bg-ember/10 transition-colors p-4 flex flex-col items-center gap-2 text-center min-h-[180px]"
          >
            <div className="text-[36px]" style={{ color: rarityColor(it.rarity) }}>
              {it.glyph}
            </div>
            <div className="text-[11px] text-ink">{it.name}</div>
            <div className="text-[8px] tracking-widest" style={{ color: rarityColor(it.rarity) }}>
              [{it.rarity.toUpperCase()}]
            </div>
            <div className="text-[9px] text-ink-dim italic mt-1">{it.desc}</div>
            {it.upside && <div className="text-[8px] text-mind-bright">{it.upside}</div>}
            {it.downside && <div className="text-[8px] text-blood">{it.downside}</div>}
          </button>
        ))}
      </div>
    </div>
  );
}

function Log({ lines }: { lines: string[] }) {
  const last3 = lines.slice(-3);
  return (
    <div className="mt-2 text-[10px] leading-relaxed text-ink-dim opacity-70 h-12 overflow-hidden">
      {last3.map((l, i) => (
        <div key={i} className={i === last3.length - 1 ? "text-ink/70" : ""}>
          {">"} {l}
        </div>
      ))}
    </div>
  );
}

function FogLayer() {
  const particles = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 6,
      size: 2 + Math.random() * 3,
      opacity: 0.05 + Math.random() * 0.18,
    }));
  }, []);
  return (
    <div className="absolute inset-0 pointer-events-none z-0">
      <div
        className="absolute inset-0 bg-gradient-radial"
        style={{
          background: "radial-gradient(ellipse at 50% 60%, rgba(217,122,42,0.06) 0%, rgba(7,8,12,0) 60%)",
        }}
      />
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute drift"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: `rgba(201,196,176,${p.opacity})`,
            animationDelay: `${p.delay}s`,
            boxShadow: "0 0 4px rgba(201,196,176,0.2)",
          }}
        />
      ))}
      <div className="scanline-fast" />
    </div>
  );
}
