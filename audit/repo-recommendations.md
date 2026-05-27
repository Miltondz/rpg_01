# Recommendations from Reference Repos

Analyzed: **darkmoor** (ntk4/darkmoor — Java/libGDX EOB2 remake) and  
**Lands of Lore JS** (stephan-romhart — JS canvas port of Westwood 1993).

---

## Quick Reference

| # | Feature | Source | Impact | Effort | Priority |
|---|---------|--------|--------|--------|----------|
| 1 | Fog-of-war automap | LoL JS `automap.js` | High | Low | **Do first** |
| 2 | Wall-hit camera bump | LoL JS `map.js` | Medium | Low | **Do first** |
| 3 | Configurable CriticalHit | darkmoor `CriticalHit.java` | High | Low | **Do first** |
| 4 | Dice notation (XdY+Z) | darkmoor `Dice.java` | High | Medium | Next sprint |
| 5 | Tile Actor system | darkmoor `Square.java` | High | Medium | Next sprint |
| 6 | Per-tile Decoration | darkmoor `Decoration.java` | Medium | Medium | Next sprint |
| 7 | Smooth turn animation | LoL JS `map.js` | Medium | Medium | Polish |
| 8 | ViewField cone of vision | darkmoor `ViewField.java` | Medium | High | Future |
| 9 | Spell slot system | darkmoor `SpellBook.java` | Medium | High | Future |

---

## 1. Fog-of-War Automap ⭐

**Source:** `js/automap.js` in Lands of Lore JS (7.5 KB, fully working)

**What it does:** Each tile has an `explored: 0/1` flag. On player move, call `setTileAsExplored(x, y)` which marks the tile + neighbors in a cone pattern. `automap.draw()` iterates tiles, only renders `explored == 1` tiles, uses neighbor wall-checks (N/S/E/W) to pick one of 16 sprite positions (floor corridor shapes), draws doors and teleports with separate symbols and a legend.

**What we're missing:** Our minimap renders ALL tiles regardless of exploration. No fog of war.

**How to port:**
1. Add `explored: false` to tile data in `GridSystem.js` tiles.
2. In `MovementController.js` `movementCompleted`, call `gridSystem.setTileExplored(x, z)` (marks tile + N/E/S/W neighbors).
3. In minimap rendering (`initializeMinimap` / `updateMinimap` in `main.js`), skip cells where `!tile.explored`.
4. On level load, mark spawn tile explored.

**Effort:** ~1–2 hours. No new files needed.

---

## 2. Wall-Hit Camera Bump ⭐

**Source:** `js/map.js` → `cameraAnimationWallHit()` in Lands of Lore JS

**What it does:** When player tries to move into a wall, plays a short zoom-in/out animation (scale 1.05→1.00 over 5 frames for forward hit) or a horizontal offset (-13→-3→0) for lateral hits. Creates visceral feedback.

**What we're missing:** Our `MovementController.js` emits `movementBlocked` but the renderer just ignores it.

**How to port:**
```javascript
// In MovementController.js, after emitting movementBlocked:
window.dispatchEvent(new CustomEvent('movementBlocked', { detail: { direction } }));

// In Renderer.js or main.js, handle movementBlocked:
window.addEventListener('movementBlocked', ({ detail }) => {
  this.renderer.startWallHitAnim(detail.direction); // shake camera
});
```
Camera shake: temporarily offset `camera.position.z` by +0.1 over 80ms then return. Or use Three.js camera fov zoom (105% → 100% over 5 frames).

**Effort:** ~2 hours. Very high game-feel payoff per hour.

---

## 3. Configurable CriticalHit ⭐

**Source:** darkmoor `CriticalHit.java`

**What it does:** Crit is not hardcoded at "roll 20". Each weapon/skill defines `minimum` and `maximum` roll thresholds and a `multiplier`. Default: rolls 20–20 deal 2x damage. A legendary axe might set min=18, max=20, multiplier=3.

**Our current state:** `ActionResolver.js` has hardcoded `critChance` as a flat percentage, no multiplier config. Rogue's displayed crit chance can exceed 100% (known bug in `docs/known-issues.md`).

**How to port:**
```javascript
// In src/engine/balance/CombatBalanceConfig.js, add:
static CRIT_DEFAULTS = { minimum: 18, maximum: 20, multiplier: 2 };

// In ActionResolver.resolveAction(), replace flat critChance with:
const roll = Math.floor(Math.random() * 20) + 1;
const crit = roll >= critConfig.minimum && roll <= critConfig.maximum;
const damage = baseDamage * (crit ? critConfig.multiplier : 1);
```
Items/skills in `ItemDatabase` and `SkillSystem` can override `critConfig` per entry.

**Effort:** ~2 hours. Fixes existing Rogue crit bug as side effect.

---

## 4. Dice Notation System (XdY+Z)

**Source:** darkmoor `Dice.java`

**What it does:** Encodes damage/stats as dice expressions: `2d6+3` = roll 2 six-sided dice, add 3. Has `DCType` difficulty check enum (VeryEasy=0 … NearlyImpossible=40) for skill checks.

**Our current state:** `EnemyDatabase.js` and `ItemDatabase.js` use flat `min`/`max` damage ranges. No skill check system.

**JS port sketch:**
```javascript
// src/engine/utils/Dice.js
export class Dice {
  constructor(throws, faces, modifier = 0) {
    this.throws = throws; this.faces = faces; this.modifier = modifier;
  }
  static parse(expr) { // '2d6+3'
    const m = expr.match(/^(\d+)d(\d+)([+-]\d+)?$/);
    return new Dice(+m[1], +m[2], +(m[3] ?? 0));
  }
  roll() {
    let v = 0;
    for (let i = 0; i < this.throws; i++) v += Math.floor(Math.random() * this.faces) + 1;
    return v + this.modifier;
  }
  toString() { return `${this.throws}d${this.faces}${this.modifier >= 0 ? '+' : ''}${this.modifier}`; }
}
```
Enemy entries would change from `{ atk: { min: 5, max: 10 } }` to `{ atkDice: '2d4+1' }`.

**Effort:** ~4 hours (new file + migrate ItemDatabase + EnemyDatabase entries). High value for game feel and mod-friendliness.

---

## 5. Tile Actor System

**Source:** darkmoor `Square.java` (18 KB)

**What it does:** Each tile holds one `SquareActor` which is one of: `Door`, `Teleporter`, `PressurePlate`, `Pit`, `WallSwitch`, `ForceField`, `Stair`, `Alcove`. Tiles have 4 `SquarePosition` sub-slots (NW/NE/SW/SE) for item placement. Events: `OnTeamEnter`, `OnTeamStand`, `OnTeamLeave`, `OnDropItem`, `OnCollectItem`, `OnClick`. Illusion walls are passable but look solid.

**Our current state:** `GridSystem.js` tiles have `type` (floor/wall/door/transition) and `metadata`. No sub-positions, no PressurePlate, no Pit, no ForceField, no illusion walls.

**What to borrow:**
- `SquarePosition` sub-slots → items dropped on floor visible in 4 corners.
- `PressurePlate` → step-on triggers (already partially done by `ZoneTriggerSystem`, but no visual).
- `Pit` → trap tiles that drop party HP.
- Illusion wall type → player can walk through, but rendered as wall until touched.
- `OnTeamEnter/Leave` events → hook into `movementCompleted` CustomEvent.

**Effort:** ~1 day. Extend tile schema + add PressurePlate/Pit/IllusionWall to `CollisionSystem.js`.

---

## 6. Per-Tile Decoration with Interaction Hooks

**Source:** darkmoor `Decoration.java` (8.4 KB) + `DecorationSet.java`

**What it does:** Each tile side (N/S/E/W) can have a `Decoration` with: texture ID per ViewField position, screen location, horizontal-flip flag, and action hooks (`onBashId`, `onHackId`, `onClickId`). Decorations are independent of tile type — a floor tile can have a shelf decoration on its north wall, a barrel on its south wall.

**Our current state:** `ZoneTriggerSystem` handles tile triggers via `tile.triggers[]` array in JSON, but triggers have no visual decoration component. Props are spawned as Three.js geometry, not tile-side sprites.

**What to borrow:**
- Separate decoration data from triggers: each tile side can declare a decoration ID + optional trigger.
- `forceDisplay` flag overrides depth-based culling.
- `hideItems` flag hides items in this tile (for hidden cache puzzles).

**Effort:** ~1 day. Add `decorations: { north: id, south: id, east: id, west: id }` to tile JSON schema + render in `DungeonLoader.js`.

---

## 7. Smooth 90-Degree Turn Animation

**Source:** LoL JS `map.js` → `cameraAnimationTurnLeft/Right()`

**What it does:** On turn, renders a `tempMap` (second render of adjacent view) and slides `map.newX` from 0 → ±310 over 3 frames while `tempMap.newX` slides in from ∓310 → 0. Creates a slide-pan turn effect identical to classic dungeon crawlers.

**Our current state:** Turns are instant (camera Y-rotation snaps).

**How to port:** This requires rendering 2 frames of the Three.js view and compositing via canvas or CSS offset. Can approximate with a quick CSS translate animation on the `#game-canvas` element: slide canvas left/right over 80ms on turn, while a `tempCanvas` (screenshot of pre-turn view) slides out from the opposite direction.

**Effort:** ~4–6 hours. Pure polish, no gameplay change.

---

## 8. ViewField Cone of Vision (FOV)

**Source:** darkmoor `ViewField.java`

**What it does:** A 5×5 cone of 16 named positions (A–O + Team) relative to player direction. Used to determine: which wall faces are visible, where to draw decorations, which enemies are in view. Not raycast-based — pure grid math.

```
ABCDE    (5 tiles, far row)
FGHIJ    (5 tiles, mid row)
KLM      (3 tiles, near row)
N^O      (1 left, player ^, 1 right)
```

**Our current state:** Three.js frustum culling handles visibility. We don't need ViewField for rendering, but could use it for:
- Limiting which enemies are "in view" for targeting.
- Determining which decorations/items the player can see/click.
- Atmospheric fog density based on distance.

**Effort:** ~1 day to implement, but Three.js already handles the hard parts. Value mostly in enemy/item visibility logic.

---

## 9. Spell Slot System

**Source:** darkmoor `SpellBook.java`

**What it does:** Per-hero, per-class spell list. Level-based slots (Mage and Cleric have separate lists). `hero.popSpell(class, level, slot)` consumes the slot on cast. Book item opens Mage spellbook, HolySymbol opens Cleric prayerbook.

**Our current state:** `SkillSystem.js` manages skills with AP cost. No slot-based spell resource.

**Value:** Adds D&D-style resource management (rest to restore spells). Big gameplay depth addition. Only relevant after campaign content exists.

**Effort:** ~2 days. Requires rest/camp system to restore slots.

---

## Not Worth Porting

| Feature | Why skip |
|---------|----------|
| darkmoor `AutoMap.java` | Stub only — "TODO..." comment, no actual logic. Use LoL JS version instead. |
| LoL JS `textures.js` | Pre-sliced PNG depths (0–3) × positions. Our Three.js handles this better. |
| LoL JS `bitmap_font.js` | We use CSS fonts. Canvas bitmap font has worse DPI scaling. |
| darkmoor `CampDialog.java` | Needs full rest/camp system — major feature, no existing hook. |
| darkmoor `SwitchCount.java` | Simple counter for lever puzzles. Our `ZoneTriggerSystem` + `once` flag covers this. |

---

## Recommended Implementation Order

1. **Fog-of-war minimap** — 2 hours, high atmosphere impact, uses existing minimap code.
2. **Wall-hit camera bump** — 2 hours, pure game feel.
3. **Configurable CriticalHit** — 2 hours, fixes existing Rogue bug.
4. **Dice system** — 4 hours, data-driven damage expressions.
5. **Tile Actor extensions** (PressurePlate, Pit, Illusion wall) — 1 day, puzzle/trap foundation.
