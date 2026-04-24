# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

- **porta-27** — 2D pixel-art roguelike "Porta 27". 100-door corridor, vida + sanidade resources, procedural rooms, item synergies. Frontend-only (no backend). Files in `artifacts/porta-27/src/game/`.
  - Combat: turn-based encounters (Atacar/Defender/Usar item/Fugir). Flee chance scales with HP ratio. `combat.ts` + `CombatScreen.tsx`.
  - Items: 4 rarities (Comum/Raro/Épico/Divino). Each item instance has `uid` + `acquiredAtDoor` for tracking. Discard locked until carried 2+ doors; cursed items can't be discarded.
  - Equipment: 3 armor slots (boots/chest/helmet) + weapon, 4 tiers each (Couro/Ouro/Adamantium/Encantada). Boots also boost shortcut chance.
  - Active items: Olho de Vidro reveals true door kinds on hover (consumed on next door choice). Totem do Tempo auto-revives 5 doors back on death (one-shot).
  - Persistent inventory panel in bottom-right (`Inventory.tsx`): hover tooltips, equip/use/discard actions, lock + curse + equipped indicators.
  - Starter items: 3 low-tier consumables/passives at game start.
