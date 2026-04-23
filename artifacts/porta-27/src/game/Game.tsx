import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { Door, Item, RunState } from "./types";
import { aggregateEffects, generateDoors, generateMapPreview } from "./generate";
import { buildRoom, type RoomData } from "./rooms";
import { sfx, startAmbient, setMuted, isMuted } from "./audio";
import { makeRng } from "./rng";
import { Title } from "./Title";
import { HUD } from "./HUD";
import { Corridor } from "./Corridor";
import { DoorChoices } from "./DoorChoices";
import { RoomScreen } from "./RoomScreen";
import { GameOver } from "./GameOver";
import { Victory } from "./Victory";
import { Inventory } from "./Inventory";

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
  } catch {
    // ignore
  }
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
    bestRun: 0,
    totalRuns: 0,
    deathCause: "",
    seed,
    healGained: 0,
    roomsCleared: 0,
  };
}

const HEAL_INTERVAL = 2;
const HEAL_CAP = 10;

type Action =
  | { type: "start"; seed: number }
  | { type: "rollDoors" }
  | { type: "chooseDoor"; door: Door }
  | { type: "applyResolution"; payload: { hpDelta?: number; sanityDelta?: number; goldDelta?: number; itemGained?: Item | null; itemRemovedId?: string; message: string; extraDoorAdvance?: number; extraDoorRetreat?: number } }
  | { type: "endRoom" }
  | { type: "reset"; seed: number }
  | { type: "log"; line: string }
  | { type: "setMeta"; meta: MetaSave }
  | { type: "victory" };

function reducer(state: RunState, action: Action): RunState {
  switch (action.type) {
    case "start": {
      return {
        ...makeInitialRun(action.seed),
        phase: "doors",
        bestRun: state.bestRun,
        totalRuns: state.totalRuns,
      };
    }
    case "rollDoors": {
      return state;
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

      return {
        ...state,
        sanity: newSanity,
        hp: newHp,
        gold: newGold,
        doorNumber: newDoorNumber,
        currentRoom: { door: action.door, eventIndex: 0, data: null },
        phase: "room",
        roomResolved: false,
        log: log.slice(-30),
      };
    }
    case "applyResolution": {
      const p = action.payload;
      const items = [...state.items];
      if (p.itemRemovedId) {
        const idx = items.findIndex((i) => i.id === p.itemRemovedId);
        if (idx >= 0) items.splice(idx, 1);
      }
      if (p.itemGained) {
        items.push(p.itemGained);
      }
      const eff = aggregateEffects(items);
      const newMaxHp = Math.max(3, 10 + eff.maxHpBonus);
      const newMaxSanity = Math.max(3, 10 + eff.maxSanityBonus);

      const newHp = Math.max(0, Math.min(newMaxHp, state.hp + (p.hpDelta ?? 0)));
      const newSanity = Math.max(0, Math.min(newMaxSanity, state.sanity + (p.sanityDelta ?? 0)));
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
        maxHp: newMaxHp,
        maxSanity: newMaxSanity,
        doorNumber: newDoorNumber,
        log,
        phase,
        deathCause,
        roomResolved: true,
      };
    }
    case "endRoom": {
      if (state.phase !== "room") return state;
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
        if (gained > 0) {
          healGained += gained;
        }
        log.push("Voce respira fundo. (+1 vida, +1 sanidade)");
      }
      return {
        ...state,
        currentRoom: null,
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
    case "log": {
      return { ...state, log: [...state.log, action.line].slice(-30) };
    }
    case "setMeta": {
      return { ...state, bestRun: action.meta.bestRun, totalRuns: action.meta.totalRuns };
    }
    case "victory": {
      return { ...state, phase: "victory" };
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
  const [showInventory, setShowInventory] = useState(false);
  const meta = useRef<MetaSave>(loadMeta());

  // Per-step deterministic rng based on (seed, doorNumber)
  const stepRng = useMemo(() => {
    return makeRng(state.seed ^ (state.doorNumber * 2654435761));
  }, [state.seed, state.doorNumber]);

  const eff = useMemo(() => aggregateEffects(state.items), [state.items]);

  // Generate doors when entering "doors" phase
  const doorsForChoice = useMemo<Door[]>(() => {
    if (state.phase !== "doors") return [];
    return generateDoors(stepRng, state.doorNumber, state.items, eff);
  }, [state.phase, state.doorNumber, state.items, stepRng, eff]);

  // Map preview if item enables it
  const mapPreview = useMemo(() => {
    if (!eff.mapBonus) return null;
    return generateMapPreview(state.seed, state.doorNumber + 1, 5, state.items);
  }, [eff.mapBonus, state.seed, state.doorNumber, state.items]);

  // Build current room data
  const roomData = useMemo<RoomData | null>(() => {
    if (state.phase !== "room" || !state.currentRoom) return null;
    const ctxRng = makeRng((state.seed ^ state.doorNumber * 16777619) >>> 0);
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

  const handleChooseDoor = useCallback((door: Door) => {
    sfx.doorOpen();
    dispatch({ type: "chooseDoor", door });
  }, []);

  const handleResolve = useCallback((res: ReturnType<typeof buildRoom>["options"][number]["resolve"] extends (...a: any[]) => infer R ? R : never) => {
    if ((res.hpDelta ?? 0) < 0) sfx.hit();
    if ((res.hpDelta ?? 0) > 0) sfx.heal();
    if ((res.goldDelta ?? 0) > 0) sfx.coin();
    if (res.itemGained) sfx.treasure();
    if ((res.sanityDelta ?? 0) < 0) sfx.insanity();
    dispatch({ type: "applyResolution", payload: res });
  }, []);

  const handleContinue = useCallback(() => {
    sfx.step();
    dispatch({ type: "endRoom" });
  }, []);

  const handleReset = useCallback(() => {
    sfx.select();
    dispatch({ type: "reset", seed: (Date.now() ^ Math.floor(Math.random() * 1e9)) & 0xffffffff });
  }, []);

  // Save meta on death/victory
  useEffect(() => {
    if (state.phase === "gameover") {
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
  }, [state.phase, state.doorNumber]);

  // First user gesture starts ambient
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

  return (
    <div className="crt relative w-full min-h-screen md:h-full bg-bg md:overflow-hidden flex flex-col items-center justify-center select-none">
      {/* Background fog particles */}
      <FogLayer />

      {state.phase === "title" && (
        <Title
          bestRun={state.bestRun}
          totalRuns={state.totalRuns}
          onStart={handleStart}
        />
      )}

      {state.phase !== "title" && state.phase !== "gameover" && state.phase !== "victory" && (
        <div className="relative z-10 w-full max-w-[1100px] px-2 sm:px-4 py-3 flex flex-col min-h-screen md:h-full">
          <HUD state={state} onMute={toggleMute} muted={muted} onInventory={() => setShowInventory(true)} />

          <Corridor doorNumber={state.doorNumber} mapPreview={mapPreview} />

          <div className="flex-1 min-h-0 mt-3">
            {state.phase === "doors" && (
              <DoorChoices
                doors={doorsForChoice}
                onChoose={handleChooseDoor}
                eff={eff}
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
          </div>

          <Log lines={state.log} />
        </div>
      )}

      {state.phase === "gameover" && (
        <GameOver
          doorReached={state.doorNumber}
          cause={state.deathCause}
          onRetry={handleReset}
          bestRun={state.bestRun}
        />
      )}

      {state.phase === "victory" && (
        <Victory onAgain={handleReset} />
      )}

      {showInventory && (
        <Inventory items={state.items} onClose={() => setShowInventory(false)} eff={eff} />
      )}
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
      <div className="absolute inset-0 bg-gradient-radial" style={{
        background: "radial-gradient(ellipse at 50% 60%, rgba(217,122,42,0.06) 0%, rgba(7,8,12,0) 60%)",
      }} />
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
