# Dungeon Crawler Engine

Browser-based turn-based RPG / dungeon crawler. Vanilla ES6 modules + Three.js r128. No build step, no package.json.

![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)
![Three.js](https://img.shields.io/badge/Three.js-r128-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Status: Active Development

Core exploration + combat loop is playable. Party creation, dungeon exploration (first-person 3D), turn-based combat, shop, save/load, NPCs, and narrative dialogue are all integrated and running.

Latest: bug fixes — combat UI no longer multiplies buttons after repeated combats (zombie `setTimeout` cancelled on new combat start); window resize during combat no longer leaves undrawn black zones (`Renderer.handleResize` now uses `window.innerWidth/innerHeight` instead of canvas inline-style dimensions).

## Running

Requires a local HTTP server (ES modules + JSON level fetches require it):

```bash
python -m http.server 8000
# or
npx http-server
```

Open `http://localhost:8000`.

## Controls

| Key | Action |
|-----|--------|
| W / ↑ | Move forward |
| S / ↓ | Move backward |
| A / ← | Turn left |
| D / → | Turn right |
| E / Space | Interact (doors, NPCs) |
| ESC | Pause menu |
| I | State dump (debug) |
| P | Full system diagnosis |
| F | Performance stats |
| L | Cycle test levels |

## Architecture

Entry point: `index.html` → `src/main.js` (`DungeonCrawlerEngine` class).

```
src/engine/
├── core/         GridSystem, Renderer (Three.js), Direction (N/E/S/W source of truth)
├── managers/     InputManager, MovementController, GameLoopManager
├── systems/      CollisionSystem, DoorSystem, TransitionSystem, EncounterSystem
├── character/    Character, CharacterClasses, SkillSystem, ExperienceSystem, PartyManager
├── combat/       CombatSystem (AP-driven), EnemyAI (4 archetypes), ActionResolver, TargetingSystem
├── inventory/    InventorySystem (40 slots), ItemDatabase (singleton), ConsumableSystem
├── equipment/    Equipment slots and bonuses
├── loot/         LootSystem — drop tables, chest rolls
├── shop/         ShopSystem (singleton) — level-scaled inventory, buy/sell
├── save/         SaveSystem, AutoSaveManager, SaveData (localStorage, multi-slot)
├── balance/      CombatBalanceConfig, BalanceTuningSystem — tune values here not in combat code
├── performance/  PerformanceManager, MemoryManager, GeometryInstancer, FrustumCuller
├── campaign/     CampaignManager — multi-floor dungeon progression
├── narrative/    NarrativeManager — inkjs 2.x story playback
├── npc/          NPCEngine, NPC, NPCBehavior, NPCRelationshipSystem
├── loaders/      DungeonLoader — parses levels/*.json, builds Three.js geometry
├── data/         EnemyDatabase (singleton)
├── utils/        Logger (tag-based), SystemInspector
└── ui/           CombatUI, CombatUIManager, InventoryUI, CharacterSheetUI,
                  ShopUI, SaveLoadUI, EquipmentUI, PartyCreationUI,
                  SplashScreen, MainMenuScreen, PauseMenuScreen, OptionsScreen,
                  NarrativeUI, DebugUI, UIRouter (exclusive screen stack)
```

## Key Conventions

- Grid: integer `(x, z)` — z increases southward. Direction: `0/1/2/3` = N/E/S/W. Always import `Dir` from `src/engine/core/Direction.js`.
- Three.js is a CDN global (`THREE`). No imports needed.
- Singletons are pre-instantiated: `itemDatabase`, `enemyDatabase`, `shopSystem`, `lootSystem` — import the instance, never `new`.
- All `import` paths must include `.js` extension.

## Content

- **Dungeon**: `levels/crypt-of-shadows-floor-{1..5}.json` + `campaigns/crypt-of-shadows-config.json`
- **Enemies**: `src/engine/data/EnemyDatabase.js` — add via `this.addEnemy(id, { tier, baseStats, aiType, skills, resistances, lootTable })`
- **Items**: `src/engine/inventory/ItemDatabase.js` — add via `this.addItem(id, { name, type, rarity, ... })`
- **NPCs**: `npcs/crypt-of-shadows/*.json` + `narratives/crypt-of-shadows/*.json` (inkjs 2.x compiled format)
- **Balance**: `src/engine/balance/` — damage/XP formulas live here

## Testing

Standalone HTML harnesses at repo root — open via local server:

- `test-combat-system.html`
- `test-character-system.html`
- `test-inventory-system.html`
- `test-save-system.html`
- `test-loot-shop-system.html`
- `test-comprehensive-integration.html`
- `demo-scenario.html` — guided playable demo

Node validators (no deps):
```bash
node validate-enemy-roster.js
node validate-performance-systems.js
```

In-browser debug (DevTools console):
```javascript
Logger.setLevel(LogLevel.DEBUG)
Logger.enable('Combat', 'Movement')
window.inspect()          // live subsystem state
window.dungeonEngine      // engine instance
```

## License

MIT
