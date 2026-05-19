# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Browser-based turn-based RPG / dungeon crawler engine. Vanilla ES6 JavaScript modules + Three.js r128 (loaded from CDN). **No build step, no package.json, no node_modules.** Designed as theme-agnostic engine — `src/engine/` is intentionally decoupled from any specific game theme.

## Integration Status (Critical Context)

The engine is **~85% complete at module level but ~25% integrated**. Individual modules work in their `test-*.html` harnesses, but `src/main.js` only wires the exploration subsystem (movement, collision, render, debug UI, minimap). The following are **not yet mounted in main.js**: CombatUI, InventoryUI, EquipmentUI, CharacterSheetUI, ShopUI, SaveLoadUI, PartyCreationUI. The campaign levels (`crypt-of-shadows-floor-{1..5}.json`) are never loaded in the main flow — only `test-room-10x10.json` loads on startup.

See `audit/REPORT.md` for the full integration audit with a staged fix plan (Etapas 0–6).

## Running the Game

Must serve over HTTP (ES module imports + JSON level fetches won't work via `file://`):

```powershell
python -m http.server 8000
# or: npx http-server
```

Then open `http://localhost:8000`. Main entry: `index.html` → `src/main.js`.

## Testing

No framework, no `npm test`. Tests are **standalone HTML harnesses** at the repo root — one per system. Open the matching `test-*.html` in the browser via the local server. Examples:

- `test-combat-system.html`, `test-character-system.html`, `test-inventory-system.html`
- `test-save-system.html`, `test-loot-shop-system.html`, `test-equipment-system.html`
- `test-performance-stress.html` — long-running perf/memory test
- `test-comprehensive-integration.html` — end-to-end flow
- `demo-scenario.html` — guided 45–60 min playable demo

Standalone validators (Node, no deps):
```powershell
node validate-enemy-roster.js
node validate-performance-systems.js
```

In-game debug keys (active in main engine, see `src/main.js`):
`I` state dump · `M` minimap test · `P` full diagnosis · `F` perf stats · `T` 10-min session test · `L` cycle test levels · `C` combat perf test · `S` save/load perf test · `R` perf report.

`window.dungeonEngine` exposes the live engine instance in DevTools.

## Architecture

### Entry point
`src/main.js` defines `DungeonCrawlerEngine` class. `initialize()` wires every subsystem, then `start()` runs a `requestAnimationFrame` loop (`gameLoop` → `update(dt)` → `render()`). The engine instance owns all subsystems and is the dependency-injection hub — subsystems generally receive references via constructor from `initializeSystems()`, not via globals.

### Layered system layout under `src/engine/`

- **`core/`** — `GridSystem` (tile grid + coord conversion), `Renderer` (Three.js scene/camera/lights), `Direction.js` (canonical N/E/S/W table — **single source of truth**, import `Dir` from here, never duplicate the table).
- **`managers/`** — `InputManager` (action queue, blocks during animation), `MovementController` (grid-stepped movement w/ interpolation), `GameLoopManager` (high-level exploration↔combat flow orchestration).
- **`systems/`** — `CollisionSystem`, `DoorSystem`, `TransitionSystem` (level switching w/ fade), `EncounterSystem`, `DifficultyScalingSystem`, `SafeZoneSystem`.
- **`character/`** — `Character`, `CharacterClasses` (Warrior/Rogue/Mage/Cleric), `SkillSystem`, `ExperienceSystem` (XP = 50×Level²), `PartyManager`.
- **`combat/`** — `CombatSystem` (turn-based, AP-driven), `EnemyAI` (4 archetypes: Aggressive/Defensive/Tactical/Berserker), `ActionResolver`, `TargetingSystem`, `Enemy`.
- **`inventory/`** — `InventorySystem` (40 slots), `Item`, `ItemDatabase`, `ConsumableSystem`. **`itemDatabase` exported as singleton instance**, not class.
- **`equipment/`**, **`loot/`**, **`shop/`** — gear, drops, vendors.
- **`save/`** — `SaveSystem`, `AutoSaveManager`, `SaveValidator`, `SaveData` (localStorage, multi-slot, corruption recovery; <1s target).
- **`balance/`** — `CombatBalanceConfig`, `BalanceTuningSystem`, `ResourceEconomySystem`. Damage/XP formulas live here; tune values here, not in combat logic.
- **`performance/`** — `PerformanceManager` (orchestrator) coordinates `PerformanceOptimizer`, `MemoryManager`, `GeometryInstancer`, `FrustumCuller`, `PerformanceBenchmark`, `PerformanceTester`. Targets 60fps, <400MB.
- **`ui/`** — Per-screen UI classes (`CombatUI`, `InventoryUI`, `CharacterSheetUI`, `ShopUI`, `SaveLoadUI`, `EquipmentUI`, `PartyCreationUI`, etc.) plus `DebugUI`, `VisualEffectsSystem`, `UIPolishSystem`. UI is plain DOM — `index.html` declares panel skeletons with `data-ui-component`/`data-ui-name` attributes; UI classes manipulate them directly.
- **`loaders/`** — `DungeonLoader` parses `levels/*.json`, builds grid, spawns geometry, sets player spawn.
- **`data/`** — `EnemyDatabase` (also a singleton instance export).
- **`utils/`** — `Logger.js` (structured logging with tags/levels), `SystemInspector.js` (live subsystem state dump via `window.inspect()`).

### Coordinate / direction conventions
- Grid: integer `(x, z)` with `z` going south (positive = forward into screen).
- Direction encoded as `0/1/2/3` = N/E/S/W. **Always import `Dir` from `src/engine/core/Direction.js`** — do not add a local direction table. Three.js camera default looks toward `-Z` = North, so `camera.rotation.y = 0` faces North.

### Levels
JSON files in `levels/`. Default startup loads `levels/test-room-10x10.json`. `L` key cycles through a hardcoded test list in `loadTestLevel()`. The shipped content campaign is `crypt-of-shadows-floor-1.json` … `-5.json` with `crypt-of-shadows-config.json` as the campaign manifest (not yet wired to the main flow — see audit Etapa 4).

### Cross-system events
Window-level `CustomEvent`s for cross-cutting flow: `movementBlocked`, `doorOpened`, `levelTransition`, `transitionError`, `combatStart`, `combatVictory`, `gameLoadRequested`, `openEquipmentSelection`. The main engine listens and routes to `DebugUI` toasts. See `audit/04-events.md` for the full emitter↔listener map; several events currently have no listener (orphaned).

## Logging

`src/engine/utils/Logger.js` provides structured, tag-based logging. Use it instead of `console.log`:

```javascript
import { Logger, LogLevel } from '../utils/Logger.js';
const log = Logger.tag('Movement');
log.debug('forward', { from, to, blocked });
log.warn('collision', { pos });
```

Runtime control in browser DevTools:
```javascript
Logger.setLevel(LogLevel.DEBUG)          // global threshold
Logger.enable('Input', 'Movement')       // tag whitelist
Logger.setTagLevel('Combat', LogLevel.WARN)
copy(Logger.asText({ tag: 'Movement' })) // dump filtered to clipboard
window.inspect()                         // live subsystem state (SystemInspector)
```

Standard tags: `Boot`, `Movement`, `Input`, `UI:<Screen>`, `Event:<name>`, `Combat`, `Save`, `Asset`.

## Adding Content (don't fight the patterns)

- **Enemy** → `src/engine/data/EnemyDatabase.js` via `this.addEnemy(id, {...})`. Required: `tier` (1/2/3/'boss'), `baseStats {HP,ATK,DEF,SPD,element}`, `aiType`, `skills[]`, `resistances`, `lootTable`.
- **Item** → `src/engine/inventory/ItemDatabase.js`.
- **Skill** → `src/engine/character/SkillSystem.js`.
- **Level** → new JSON in `levels/`, match existing schema (width, height, tiles, doors, transitions, spawn).
- **Balance tweaks** → `src/engine/balance/*`, not the combat code.

## Things to know before editing

- **Singletons are pre-instantiated.** `itemDatabase`, `enemyDatabase`, `shopSystem`, `lootSystem` are exported as constructed instances (lowercase). Don't `new` them — import the instance.
- **Three.js is a global** (`THREE`) from the CDN script in `index.html`, not an npm import. `src/` code references `THREE.*` directly.
- **No bundler.** All `import` paths must include the `.js` extension and be browser-resolvable.
- **Status docs (`PHASE_*`, `*_IMPLEMENTATION_SUMMARY.md`) are historical.** Treat as context, not spec. Authoritative specs live under `.kiro/specs/` and `docs/`.
- **Known caveats** (see `docs/known-issues.md`): rogue crit chance can display >100%; audio system is placeholder only; mobile not fully tuned.
- **Controls inversion bug** (see audit C4/H1): `InputManager` and `MovementController` had duplicate and contradictory direction tables. `Direction.js` is the fix — check that both files import from it before trusting movement behavior.
