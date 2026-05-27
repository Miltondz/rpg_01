# Dungeon Crawler Engine

Browser-based turn-based RPG / dungeon crawler. Vanilla ES6 modules + Three.js r128. No build step, no package.json.

![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)
![Three.js](https://img.shields.io/badge/Three.js-r128-green.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## Status: Active Development

Full game loop is playable end-to-end: main menu → party creation → dungeon exploration → random encounters → turn-based combat → victory/defeat → save/load → continue.

**Latest changes — darkmoor/LoL-JS feature port (27 features):**

Phase 1 (combat depth):
- **Fog-of-war minimap** — tiles hidden until explored; spawn tile + 4 neighbors revealed on enter
- **Camera bump** — FOV bump + screen shake on wall collision; step/turn/strafe animations via `CameraAnimator`
- **Configurable crits** — d20 roll vs `critConfig.minimum/maximum`, per-weapon multiplier; fixes Rogue >100% crit bug
- **Saving throws** — Fortitude/Reflex/Will vs DC on skills; half-damage on save
- **Relative compass** — HUD shows left·ahead·right labels based on current facing
- **MazeZone XP multiplier** — level JSON `zones[]` with `xpMultiplier`; deeper areas give more XP
- **Enemy resistances** — `resistances: { fire: 0.5, poison: 'immune' }` + `immunities[]` on enemies; fixes falsy-zero resistance bug
- **Dice system** — `Dice.parse('2d6+3').roll()` + `DC` enum; used throughout combat

Phase 2 (systems):
- **Front/back row** — party formation stamped on characters; back row can't use melee
- **Roll to-hit** — d20 + ATK bonus vs target AC (DEF + SPD); attacks can miss
- **Tile face decorations** — `decorations` schema in level JSON; Three.js geometry spawned per tile face
- **WallSwitch** — `tile.wallSwitch` JSON actor; Space key activates scripts (openDoor/closeDoor/toggleDoor), optional item requirement
- **Pit traps** — `tile.pit` with `damage` (dice expr), `hidden`, `difficulty`; damage on land, optional level teleport
- **ForceField** — `tile.forceField` with `Spin/FaceTo/Move` types; redirects party on enter
- **Extended monster struct** — `detectionRange`, `sightRange`, `smartAI`, `pickupRate`, `stealRate`, `hasHealMagic`, `canMove` on all enemies
- **Camp / rest** — `Z` key opens camp overlay; restores HP + spell slots, manual save
- **EventSquare onLeave/onStand** — `triggerOn: 'leave'|'stand'|'enter'` on tile triggers
- **Spells as scripts** — `onCast: (caster, targets, level) => effects` function on skills; `fireball`, `ice_bolt`, `holy_smite` added
- **SpellBook slots** — `character.spellSlots` by level; `castSpell()` consumes slot, `restoreSpellSlots()` on rest

Phase 3 (advanced):
- **AI exploration** — `EnemyAI.updateExploration()` patrol/pursuit state machine using `detectionRange`/`sightRange`
- **Ground item sub-positions** — `GridSystem.addGroundItem/removeGroundItem/getGroundItems` with NW/NE/SW/SE slots per tile
- **Animated portraits** — `CharacterPortrait.createAnimatedCanvas()` spritesheet or procedural idle blink
- **Magic Scrolls** — `scroll_fireball`, `scroll_ice_bolt`, `scroll_holy_smite` items; `character.learnSpell()` on use
- **ViewField cone** — `ViewFieldSystem` 16-position 5×5 view cone; `isVisible()`, `getDepth()` for targeting/loot
- **Clickable movement buttons** — 3×3 D-pad in HUD bottom-right; mobile/accessibility; routes same as keyboard

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
| Q | Strafe left |
| E | Strafe right |
| Space | Interact (doors, wall switches, props, NPCs) |
| Z | Camp menu (rest, restore spell slots, save) |
| I | Inventory |
| C | Character sheet |
| ESC | Pause menu / close panel |
| F5 / F9 | Quick save / quick load |
| 1–5 | Combat actions (during combat) |
| P | Full system diagnosis (debug) |
| F | Performance stats (debug) |
| L | Cycle test levels (debug) |

Movement buttons (3×3 D-pad) also available bottom-right of HUD for mouse/touch.

## Architecture

Entry point: `index.html` → `src/main.js` (`DungeonCrawlerEngine` class).

```
src/engine/
├── core/         GridSystem (tile grid + ground item slots), Renderer (Three.js),
│                 Direction (N/E/S/W source of truth), CameraAnimator
├── managers/     InputManager, MovementController, GameLoopManager
├── systems/      CollisionSystem (wall switch handler), DoorSystem, TransitionSystem,
│                 EncounterSystem, ZoneTriggerSystem (onEnter/onStand/onLeave),
│                 ViewFieldSystem (5×5 cone of vision)
├── character/    Character (spell slots, learnSpell), CharacterClasses, SkillSystem
│                 (onCast scripts), ExperienceSystem, PartyManager (front/back row)
├── combat/       CombatSystem (AP-driven, zone XP), EnemyAI (4 archetypes + exploration
│                 patrol/pursuit), ActionResolver (d20 to-hit, saving throws),
│                 TargetingSystem, Enemy (extended struct: detectionRange, smartAI, …)
├── inventory/    InventorySystem (40 slots), ItemDatabase (magic scrolls), ConsumableSystem
├── equipment/    Equipment slots and bonuses
├── loot/         LootSystem — drop tables, chest rolls
├── shop/         ShopSystem (singleton) — level-scaled inventory, buy/sell
├── save/         SaveSystem, AutoSaveManager, SaveData (localStorage, multi-slot)
├── balance/      CombatBalanceConfig (CRIT_DEFAULTS, Dice formulas) — tune here
├── performance/  PerformanceManager, MemoryManager, GeometryInstancer, FrustumCuller
├── campaign/     CampaignManager — multi-floor dungeon progression
├── narrative/    NarrativeManager — inkjs 2.x story playback
├── npc/          NPCEngine, NPC, NPCBehavior, NPCRelationshipSystem
├── loaders/      DungeonLoader — parses levels/*.json, tile actors (pit/forceField/wallSwitch)
├── data/         EnemyDatabase (singleton, extended monster schema)
├── utils/        Logger (tag-based), SystemInspector, Dice (XdY+Z parser + DC enum)
└── ui/           CombatUI, CombatUIManager, InventoryUI, CharacterSheetUI,
                  ShopUI, SaveLoadUI, EquipmentUI, PartyCreationUI, CampUI,
                  SplashScreen, MainMenuScreen, PauseMenuScreen, OptionsScreen,
                  NarrativeUI, ExplorationHUD (animated portraits, D-pad buttons),
                  DebugUI, UIRouter (exclusive screen stack)
```

## Key Conventions

- Grid: integer `(x, z)` — z increases southward. Direction: `0/1/2/3` = N/E/S/W. Always import `Dir` from `src/engine/core/Direction.js`.
- Three.js is a CDN global (`THREE`). No imports needed.
- Singletons are pre-instantiated: `itemDatabase`, `enemyDatabase`, `shopSystem`, `lootSystem` — import the instance, never `new`.
- All `import` paths must include `.js` extension.

## Content

- **Dungeon**: `levels/crypt-of-shadows-floor-{1..5}.json` + `campaigns/crypt-of-shadows-config.json`
- **Enemies**: `src/engine/data/EnemyDatabase.js` — add via `this.addEnemy(id, { tier, baseStats, aiType, detectionRange, sightRange, smartAI, skills, resistances, immunities, flags, lootTable })`
- **Items**: `src/engine/inventory/ItemDatabase.js` — add via `this.addItem(id, { name, type, rarity, ... })`. Magic scrolls: `type: 'scroll', spellId, onUse: (user) => {...}`
- **Spells**: `src/engine/character/SkillSystem.js` — add via `this.registerSkill({ id, class, level, onCast: (caster, targets, level) => effects[] })`
- **Tile actors** (level JSON): `"wallSwitch": { side, reusable, neededItem, scripts[] }` / `"pit": { damage, hidden, difficulty }` / `"forceField": { type, spin, affectTeam }`
- **Zone triggers**: `"triggers": [{ type, text, triggerOn: 'enter'|'stand'|'leave', once }]`
- **MazeZones**: `"zones": [{ id, xpMultiplier, tiles: [[x1,z1],[x2,z2]] }]`
- **NPCs**: `npcs/crypt-of-shadows/*.json` + `narratives/crypt-of-shadows/*.json` (inkjs 2.x compiled format)
- **Balance**: `src/engine/balance/` — damage/XP formulas live here; `CombatBalanceConfig.CRIT_DEFAULTS` for crit range/multiplier

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
