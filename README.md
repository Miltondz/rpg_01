# Dungeon Crawler Engine

Browser-based turn-based RPG / dungeon crawler. Vanilla ES6 modules + Three.js r128. No build step, no package.json.

![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)
![Three.js](https://img.shields.io/badge/Three.js-r128-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Status: Active Development

Full game loop is playable end-to-end: main menu → party creation → dungeon exploration → random encounters → turn-based combat → victory/defeat → save/load → continue.

**Latest changes:**
- **Main menu redesign** — full-screen pixel RPG aesthetic with CRT scanlines, animated skull, floating particles, Credits panel, QUIT confirmation
- **Party presets** — CUSTOM / PRESETS tab toggle in party creation; 4 presets (The Covenant, Iron Vanguard, The Arcanum, Shadow Guild) with instant one-click party setup
- **Character Sheet** — Daggerfall-style redesign: party tabs, paper-doll silhouette, stat bars with visual fill, equipment anchors, skill tree
- **Inventory** — Baldur's Gate-style: item grid, detail pane, filter tabs (All/Equipment/Potions/Materials/Misc), hover tooltips
- **Journal** — BG/Morrowind style: category tabs (ALL / EVENTS / COMBAT / LOCATIONS / ITEMS), timestamped entries, color-coded by type
- **Bestiary** — Morrowind/X-COM style: two-column research view (creature list + detail pane), tier badges, encounter counter, full stats/resistances/skills/loot
- **Bug fixes**:
  - Save validation failed with "No characters in party" when `party.characters` was empty array (constructor default) — now uses whichever array has members
  - Save slot display showed "0 characters" — `getDisplayMetadata` applies same fix
  - Equipment selection overlay rendered behind Character Sheet (z-index 1000 < 2500) — raised to 3000

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
| Q / E | Strafe left / right |
| Space | Interact (doors, props, NPCs) |
| I | Inventory |
| C | Character sheet |
| ESC | Pause menu / close panel |
| F5 / F9 | Quick save / quick load |
| 1–5 | Combat actions (during combat) |
| P | Full system diagnosis (debug) |
| F | Performance stats (debug) |
| L | Cycle test levels (debug) |

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
