# F8 — Logging & Diagnostic Infrastructure

## Objetivo

Sustituir `console.log` regados por sistema de logs estructurados con:
- Niveles (DEBUG/INFO/WARN/ERROR)
- Tags por subsistema
- Filtrado runtime
- Buffer in-memory para volcado on-demand
- Inspector de estado vivo

## Modulo 1: `src/engine/utils/Logger.js`

```javascript
/**
 * Structured logger with tags, levels, and in-memory buffer.
 */
export const LogLevel = Object.freeze({
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 99,
});

class _Logger {
  constructor() {
    this.globalLevel = LogLevel.INFO;
    this.tagLevels = new Map();      // tag -> level override
    this.enabledTags = null;         // null = all, Set = whitelist
    this.buffer = [];
    this.bufferMax = 2000;
    this.sinkConsole = true;
  }

  setLevel(level)         { this.globalLevel = level; }
  setTagLevel(tag, level) { this.tagLevels.set(tag, level); }
  enable(...tags)         { this.enabledTags = new Set(tags); }
  enableAll()             { this.enabledTags = null; }
  silence(tag)            { this.tagLevels.set(tag, LogLevel.SILENT); }

  tag(tagName) {
    return {
      debug: (...a) => this._log(LogLevel.DEBUG, tagName, a),
      info:  (...a) => this._log(LogLevel.INFO,  tagName, a),
      warn:  (...a) => this._log(LogLevel.WARN,  tagName, a),
      error: (...a) => this._log(LogLevel.ERROR, tagName, a),
    };
  }

  _log(level, tag, args) {
    const threshold = this.tagLevels.get(tag) ?? this.globalLevel;
    if (level < threshold) return;
    if (this.enabledTags && !this.enabledTags.has(tag)) return;

    const entry = {
      t: performance.now(),
      level,
      tag,
      msg: args.map(a => typeof a === 'object' ? a : String(a)),
    };
    this.buffer.push(entry);
    if (this.buffer.length > this.bufferMax) this.buffer.shift();

    if (this.sinkConsole) {
      const prefix = `[${tag}]`;
      const fn = level === LogLevel.ERROR ? console.error
               : level === LogLevel.WARN  ? console.warn
               : level === LogLevel.DEBUG ? console.debug
               : console.log;
      fn(prefix, ...args);
    }
  }

  dump(filter = {}) {
    let out = this.buffer;
    if (filter.tag) out = out.filter(e => e.tag === filter.tag);
    if (filter.minLevel !== undefined) out = out.filter(e => e.level >= filter.minLevel);
    return out;
  }

  clear() { this.buffer = []; }

  asText(filter) {
    return this.dump(filter).map(e => {
      const lvl = ['DEBUG','INFO','WARN','ERROR'][e.level] || 'LOG';
      return `[${e.t.toFixed(0)}ms] [${lvl}] [${e.tag}] ${e.msg.map(m => typeof m === 'object' ? JSON.stringify(m) : m).join(' ')}`;
    }).join('\n');
  }
}

export const Logger = new _Logger();

if (typeof window !== 'undefined') {
  window.Logger = Logger;
  window.LogLevel = LogLevel;
}
```

## Modulo 2: `src/engine/utils/SystemInspector.js`

Snapshot del estado real de cada subsystem.

```javascript
import { Logger } from './Logger.js';

export class SystemInspector {
  constructor(engine) {
    this.engine = engine;
    if (typeof window !== 'undefined') {
      window.inspect = () => this.report();
      window.inspectSystem = (name) => this.system(name);
    }
  }

  report() {
    const e = this.engine;
    const r = {
      boot: { initialized: e.isInitialized, running: e.isRunning, frameCount: e.frameCount, fps: Math.round(e.fps) },
      level: this._level(),
      player: this._player(),
      party: this._party(),
      inventory: this._inventory(),
      ui: this._ui(),
      events: this._events(),
      perf: this._perf(),
    };
    console.table(this._flatten(r));
    return r;
  }

  _level() {
    const lvl = this.engine.dungeonLoader?.getCurrentLevel();
    if (!lvl) return { loaded: false };
    return { loaded: true, id: lvl.id, w: lvl.width, h: lvl.height,
             doors: lvl.doors?.length || 0, transitions: lvl.transitions?.length || 0 };
  }

  _player() {
    const mc = this.engine.movementController;
    if (!mc) return { ready: false };
    const pos = mc.getPosition();
    return { ready: true, x: pos.x, z: pos.z, dir: mc.getDirection(),
             animating: mc.getIsAnimating?.() ?? false };
  }

  _party() {
    const pm = this.engine.partyManager;
    if (!pm) return { ready: false };
    return { ready: true, size: pm.party?.length || pm.getCharacters?.()?.length || 0,
             gold: pm.gold || pm.getGold?.() || 0 };
  }

  _inventory() {
    const inv = this.engine.inventorySystem;
    if (!inv) return { ready: false };
    return { ready: true, slots: inv.size || inv.capacity,
             used: inv.items?.filter(i => i).length || 0 };
  }

  _ui() {
    return {
      debugUI: !!this.engine.debugUI,
      combatUI: !!this.engine.combatUI,
      inventoryUI: !!this.engine.inventoryUI,
      equipmentUI: !!this.engine.equipmentUI,
      characterSheetUI: !!this.engine.characterSheetUI,
      shopUI: !!this.engine.shopUI,
      saveLoadUI: !!this.engine.saveLoadUI,
      partyCreationUI: !!this.engine.partyCreationUI,
    };
  }

  _events() {
    return { logsBuffered: Logger.buffer.length };
  }

  _perf() {
    const pm = this.engine.performanceManager;
    if (!pm) return { ready: false };
    const m = pm.getPerformanceMetrics?.() || {};
    return { fps: m.fps?.toFixed(1), frameTime: m.frameTime?.toFixed(2),
             memoryMB: m.memoryUsage?.toFixed(1) };
  }

  _flatten(obj, prefix = '') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        Object.assign(out, this._flatten(v, prefix ? `${prefix}.${k}` : k));
      } else {
        out[prefix ? `${prefix}.${k}` : k] = v;
      }
    }
    return out;
  }

  system(name) {
    return this.engine[name];
  }
}
```

## Modulo 3: `src/engine/core/EventBus.js` (wrapper)

```javascript
import { Logger } from '../utils/Logger.js';

export const EventTypes = Object.freeze({
  // Movement
  MOVEMENT_BLOCKED: 'movementBlocked',
  MOVEMENT_COMPLETED: 'movementCompleted',
  DOOR_OPENED: 'doorOpened',
  LEVEL_TRANSITION: 'levelTransition',
  TRANSITION_ERROR: 'transitionError',
  // Combat
  COMBAT_START: 'combatStart',
  COMBAT_EVENT: 'combatEvent',
  COMBAT_VICTORY: 'combatVictory',
  COMBAT_DEFEAT: 'combatDefeat',
  COMBAT_UI_ACTION: 'combatUIAction',
  // Character
  CHARACTER_LEVEL_UP: 'characterLevelUp',
  PARTY_CHANGE: 'partyChange',
  GOLD_CHANGE: 'goldChange',
  // Equipment / Items
  ITEM_EQUIPPED: 'itemEquipped',
  ITEM_UNEQUIPPED: 'itemUnequipped',
  ITEM_PICKUP: 'itemPickup',
  EQUIPMENT_CHANGE: 'equipmentChange',
  // UI
  MODAL_OPEN: 'modalOpen',
  MODAL_CLOSE: 'modalClose',
  GAME_STATE_CHANGE: 'gameStateChange',
  GAME_START: 'gameStart',
  GAME_LOAD_REQUESTED: 'gameLoadRequested',
});

class _EventBus {
  constructor() {
    this.listenerCounts = new Map();
    this.knownTypes = new Set(Object.values(EventTypes));
  }

  emit(type, detail = {}) {
    if (!this.knownTypes.has(type)) {
      Logger.tag('EventBus').warn(`Unknown event type emitted: "${type}"`);
    }
    const count = this.listenerCounts.get(type) || 0;
    Logger.tag(`Event:${type}`).debug(`emit (listeners=${count})`, detail);
    if (count === 0) {
      Logger.tag('EventBus').warn(`Event "${type}" has no listeners`);
    }
    window.dispatchEvent(new CustomEvent(type, { detail }));
  }

  on(type, handler) {
    this.listenerCounts.set(type, (this.listenerCounts.get(type) || 0) + 1);
    window.addEventListener(type, handler);
    return () => this.off(type, handler);
  }

  off(type, handler) {
    window.removeEventListener(type, handler);
    const n = (this.listenerCounts.get(type) || 1) - 1;
    this.listenerCounts.set(type, Math.max(0, n));
  }

  stats() {
    return Object.fromEntries(this.listenerCounts);
  }
}

export const EventBus = new _EventBus();
if (typeof window !== 'undefined') window.EventBus = EventBus;
```

## Catalogo de tags propuesto

| Tag | Usado en | Logs minimos |
|---|---|---|
| `Boot` | main.js initialize() | cada paso + ms transcurrido |
| `Input` | InputManager | keydown → action mapping, queue size |
| `Movement` | MovementController | pre-state, target, collision, post-state |
| `Collision` | CollisionSystem | tile checks, door checks, blocks con razon |
| `Door` | DoorSystem | open/close/locked/key-used |
| `Level` | DungeonLoader | load start/end, schema valid, counts |
| `Transition` | TransitionSystem | fade in/out, target level |
| `Combat` | CombatSystem | start, turn, action, damage rolls, victory |
| `AI` | EnemyAI | archetype decision, target chosen |
| `Encounter` | EncounterSystem | trigger roll, spawn list |
| `Inventory` | InventorySystem | add/remove/move slot |
| `Equipment` | EquipmentSystem | equip/unequip, stat delta |
| `Character` | Character, ExperienceSystem | xp gain, level up, stat growth |
| `Party` | PartyManager | add/remove, gold change |
| `Save` | SaveSystem, AutoSaveManager | slot, size, ms, success |
| `UI:<Screen>` | cada UI | show/hide, stack |
| `Event:<name>` | EventBus | emit con detail + listener count |
| `Perf` | PerformanceManager | fps drops, mem peaks, optimizations applied |
| `Asset` | DungeonLoader, databases | cross-ref failures, schema warnings |
| `EventBus` | EventBus mismo | unknown types, orphan emits |

## Uso desde consola

```js
// Solo movimiento + input en DEBUG
Logger.setLevel(LogLevel.INFO)
Logger.enable('Input', 'Movement')
Logger.setTagLevel('Movement', LogLevel.DEBUG)

// Volcar todo a texto
copy(Logger.asText())   // a clipboard
console.log(Logger.asText({ tag: 'Combat' }))

// Snapshot estado
inspect()
inspectSystem('combatSystem').state

// Eventos sin escuchadores
EventBus.stats()
```

## Integracion: pasos

1. **F8.1** — Anadir `Logger.js` + `EventBus.js` + `SystemInspector.js`.
2. **F8.2** — En `main.js` initialize():
   ```js
   import { Logger, LogLevel } from './engine/utils/Logger.js';
   import { EventBus } from './engine/core/EventBus.js';
   import { SystemInspector } from './engine/utils/SystemInspector.js';

   const log = Logger.tag('Boot');
   const t0 = performance.now();
   log.info('Engine initialize() start');
   // ... cada subsystem:
   log.info(`Subsystem ${name} ready (+${(performance.now() - t0).toFixed(0)}ms)`);

   this.inspector = new SystemInspector(this);
   ```
3. **F8.3** — Reemplazar `console.log` por `Logger.tag('X').debug/info` en cada modulo conforme se toca para fix. No big-bang.
4. **F8.4** — Migrar `dispatchEvent` por `EventBus.emit` modulo-por-modulo (compatibilidad: ambos usan `window`).
5. **F8.5** — Anadir tests `test-logger.html` standalone para validar buffer + filter + dump.

## Modo produccion

`Logger.setLevel(LogLevel.WARN)` antes de release. Buffer sigue funcionando para crash reports.

## Conclusion F8

Infraestructura de logs lista para **diagnostico activo** en lugar de `console.log` regados. Cada fix de las etapas 1-5 anade logs en sitios criticos, dejando trazas reproducibles. `inspect()` da snapshot estado para reports sin pelear con DevTools.
